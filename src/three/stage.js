import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export { THREE };

// A small tabletop scene: soft studio reflections, one key light and a shadow-only floor.
export function createStage(canvas, { fov = 32 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);

  const key = new THREE.DirectionalLight(0xfff1dc, 2.2);
  key.position.set(-3, 9, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.radius = 6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfd2ff, 0.6);
  rim.position.set(5, 3, -5);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.42 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  let frame = 0;
  let tick = null;
  const render = () => renderer.render(scene, camera);
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  // Run `step(now)` every frame until it returns false.
  const animate = (step) =>
    new Promise((resolve) => {
      cancelAnimationFrame(frame);
      tick = resolve;
      const loop = (now) => {
        const more = step(now);
        render();
        if (more) frame = requestAnimationFrame(loop);
        else {
          tick = null;
          resolve();
        }
      };
      frame = requestAnimationFrame(loop);
    });

  const dispose = () => {
    cancelAnimationFrame(frame);
    tick?.();
    observer.disconnect();
    scene.traverse((object) => {
      object.geometry?.dispose();
      [object.material].flat().forEach((material) => {
        if (!material) return;
        Object.values(material).forEach(
          (value) => value?.isTexture && value.dispose(),
        );
        material.dispose();
      });
    });
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  };

  return { renderer, scene, camera, render, resize, animate, dispose };
}

export function canvasTexture(size, draw, { color = true } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  draw(canvas.getContext("2d"), size);
  const texture = new THREE.CanvasTexture(canvas);
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
