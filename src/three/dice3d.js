import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { THREE, canvasTexture, createStage, easeOutCubic } from "./stage";

const PIPS = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.27, 0.27],
    [0.5, 0.5],
    [0.73, 0.73],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.5, 0.5],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  6: [
    [0.27, 0.25],
    [0.73, 0.25],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.75],
    [0.73, 0.75],
  ],
};
// BoxGeometry material order is +x, -x, +y, -y, +z, -z; opposite faces sum to seven.
const FACE_ORDER = [2, 5, 1, 6, 3, 4];
const NORMALS = {
  2: new THREE.Vector3(1, 0, 0),
  5: new THREE.Vector3(-1, 0, 0),
  1: new THREE.Vector3(0, 1, 0),
  6: new THREE.Vector3(0, -1, 0),
  3: new THREE.Vector3(0, 0, 1),
  4: new THREE.Vector3(0, 0, -1),
};
const UP = new THREE.Vector3(0, 1, 0);
const LAYOUTS = {
  1: [[0, 0]],
  2: [
    [-0.85, 0],
    [0.85, 0],
  ],
  3: [
    [-1.55, 0.1],
    [0, -0.15],
    [1.55, 0.1],
  ],
  4: [
    [-0.85, -0.8],
    [0.85, -0.8],
    [-0.85, 0.8],
    [0.85, 0.8],
  ],
  5: [
    [-1.6, -0.8],
    [0, -0.8],
    [1.6, -0.8],
    [-0.8, 0.85],
    [0.8, 0.85],
  ],
  6: [
    [-1.6, -0.8],
    [0, -0.8],
    [1.6, -0.8],
    [-1.6, 0.85],
    [0, 0.85],
    [1.6, 0.85],
  ],
};
const CAMERA_DISTANCE = { 1: 5.2, 2: 6.4, 3: 7.6, 4: 7.4, 5: 8.6, 6: 8.6 };

function faceTextures(value) {
  const pips = PIPS[value];
  const big = value === 1;
  const map = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = "#f4efe5";
    ctx.fillRect(0, 0, s, s);
    pips.forEach(([u, v]) => {
      const r = s * (big ? 0.14 : 0.095);
      const x = u * s;
      const y = v * s;
      const g = ctx.createRadialGradient(x, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, big ? "#5e2216" : "#000");
      g.addColorStop(0.8, big ? "#8f3826" : "#0b0b0c");
      g.addColorStop(1, big ? "#b4573f" : "#2a2a2d");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  });
  const bumpMap = canvasTexture(
    256,
    (ctx, s) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, s, s);
      pips.forEach(([u, v]) => {
        const r = s * (big ? 0.14 : 0.095);
        const g = ctx.createRadialGradient(u * s, v * s, 0, u * s, v * s, r);
        g.addColorStop(0, "#000");
        g.addColorStop(0.75, "#222");
        g.addColorStop(1, "#fff");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(u * s, v * s, r, 0, Math.PI * 2);
        ctx.fill();
      });
    },
    { color: false },
  );
  return { map, bumpMap };
}

export function createDiceScene(canvas) {
  const stage = createStage(canvas);
  const geometry = new RoundedBoxGeometry(1, 1, 1, 5, 0.16);
  const materials = FACE_ORDER.map((value) => {
    const { map, bumpMap } = faceTextures(value);
    return new THREE.MeshPhysicalMaterial({
      map,
      bumpMap,
      bumpScale: 2.2,
      roughness: 0.34,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
    });
  });
  let dice = [];

  const restQuaternion = (value, yaw) =>
    new THREE.Quaternion()
      .setFromAxisAngle(UP, yaw)
      .multiply(new THREE.Quaternion().setFromUnitVectors(NORMALS[value], UP));
  // Lowest height that keeps a rotated cube above the floor.
  const halfHeight = (q) => {
    const m = new THREE.Matrix4().makeRotationFromQuaternion(q).elements;
    return 0.5 * (Math.abs(m[1]) + Math.abs(m[5]) + Math.abs(m[9]));
  };
  const frameCamera = (count) => {
    const d = CAMERA_DISTANCE[count];
    stage.camera.position.set(0, d * 0.82, d * 0.58);
    stage.camera.lookAt(0, 0, 0.15);
  };

  const layout = (values) => {
    dice.forEach((die) => stage.scene.remove(die.mesh));
    const spots = LAYOUTS[values.length];
    dice = values.map((value, i) => {
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.castShadow = true;
      const yaw = (Math.random() - 0.5) * 0.6;
      mesh.quaternion.copy(restQuaternion(value, yaw));
      mesh.position.set(spots[i][0], 0.5, spots[i][1]);
      stage.scene.add(mesh);
      return { mesh, home: spots[i] };
    });
    frameCamera(values.length);
    stage.render();
  };

  const roll = (values, { duration, stagger }) => {
    const started = [];
    const plans = dice.map((die, i) => {
      const target = restQuaternion(values[i], Math.random() * Math.PI * 2);
      const axis = new THREE.Vector3(
        Math.random() - 0.5,
        (Math.random() - 0.5) * 0.4,
        Math.random() - 0.5,
      ).normalize();
      return {
        die,
        target,
        axis,
        turns: Math.PI * 2 * (2.2 + Math.random() * 1.4),
        from: new THREE.Vector2(
          die.home[0] - 1.6 + Math.random() * 0.6,
          die.home[1] + 1.6 + Math.random() * 0.5,
        ),
        height: 1.1 + Math.random() * 0.4,
        delay: i * stagger,
      };
    });
    const spin = new THREE.Quaternion();
    return stage.animate((now) => {
      started[0] ??= now;
      let busy = false;
      plans.forEach((plan) => {
        const t = Math.min(
          1,
          Math.max(0, (now - started[0] - plan.delay) / duration),
        );
        if (t < 1) busy = true;
        const e = easeOutCubic(t);
        spin.setFromAxisAngle(plan.axis, plan.turns * (1 - e));
        const q = plan.target.clone().multiply(spin);
        const bounce =
          plan.height *
          Math.pow(1 - t, 2) *
          Math.abs(Math.cos(3 * Math.PI * Math.pow(t, 0.8)));
        const { mesh, home } = plan.die;
        mesh.quaternion.copy(q);
        mesh.position.set(
          plan.from.x + (home[0] - plan.from.x) * e,
          halfHeight(q) + bounce,
          plan.from.y + (home[1] - plan.from.y) * e,
        );
      });
      return busy;
    });
  };

  return {
    layout,
    roll,
    dispose: () => {
      geometry.dispose();
      stage.dispose();
    },
  };
}
