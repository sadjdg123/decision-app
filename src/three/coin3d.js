import { THREE, canvasTexture, createStage } from "./stage";

const RADIUS = 1;
const THICKNESS = 0.13;
const FONT =
  '-apple-system, "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", sans-serif';

// Both the colour and the relief of a face come from the same drawing, so they always line up.
function drawFace(ctx, s, glyph, word, relief) {
  const c = s / 2;
  const hi = relief ? "#fff" : "#e9d3a6";
  const lo = relief ? "#5a5a5a" : "#b89463";
  ctx.fillStyle = lo;
  ctx.fillRect(0, 0, s, s);
  if (!relief) {
    for (let r = c; r > 0; r -= 3) {
      ctx.strokeStyle = `rgba(255,255,255,${0.025 + 0.02 * Math.sin(r)})`;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = hi;
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(c, c, s * 0.465, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = hi;
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      c + Math.cos(a) * s * 0.405,
      c + Math.sin(a) * s * 0.405,
      s * 0.007,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${s * 0.38}px ${FONT}`;
  ctx.fillText(glyph, c, c - s * 0.02);
  ctx.font = `600 ${s * 0.052}px ${FONT}`;
  ctx.letterSpacing = `${s * 0.02}px`;
  ctx.fillText(word, c + s * 0.01, c + s * 0.27);
}

function faceMaterial(glyph, word) {
  const map = canvasTexture(512, (ctx, s) =>
    drawFace(ctx, s, glyph, word, false),
  );
  const bumpMap = canvasTexture(
    512,
    (ctx, s) => drawFace(ctx, s, glyph, word, true),
    {
      color: false,
    },
  );
  return new THREE.MeshPhysicalMaterial({
    map,
    bumpMap,
    bumpScale: 3,
    metalness: 1,
    roughness: 0.36,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
  });
}

function edgeMaterial() {
  const bumpMap = canvasTexture(
    512,
    (ctx, s) => {
      for (let x = 0; x < s; x += 4) {
        ctx.fillStyle = x % 8 ? "#fff" : "#444";
        ctx.fillRect(x, 0, 4, s);
      }
    },
    { color: false },
  );
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.repeat.set(4, 1);
  return new THREE.MeshPhysicalMaterial({
    color: "#c9a874",
    bumpMap,
    bumpScale: 1.5,
    metalness: 1,
    roughness: 0.3,
  });
}

export function createCoinScene(canvas) {
  const stage = createStage(canvas, { fov: 30 });
  stage.camera.position.set(0, 4.9, 3.5);
  stage.camera.lookAt(0, 0.2, 0);
  const geometry = new THREE.CylinderGeometry(
    RADIUS,
    RADIUS,
    THICKNESS,
    128,
    1,
  );
  // Cylinder groups: side, top cap, bottom cap.
  const coin = new THREE.Mesh(geometry, [
    edgeMaterial(),
    faceMaterial("正", "HEADS"),
    faceMaterial("反", "TAILS"),
  ]);
  coin.castShadow = true;
  const caps = [
    coin.material[1].map,
    coin.material[1].bumpMap,
    coin.material[2].map,
    coin.material[2].bumpMap,
  ];
  caps.forEach((texture, i) => {
    texture.center.set(0.5, 0.5);
    texture.rotation = i < 2 ? Math.PI / 2 : -Math.PI / 2;
  });
  coin.position.y = THICKNESS / 2;
  stage.scene.add(coin);
  stage.render();

  const lowest = (angle) =>
    RADIUS * Math.abs(Math.sin(angle)) +
    (THICKNESS / 2) * Math.abs(Math.cos(angle));

  let resting = 0;
  const show = (side) => {
    resting = side === "反面" ? Math.PI : 0;
    coin.rotation.set(resting, 0, 0);
    coin.position.set(0, THICKNESS / 2, 0);
    stage.render();
  };

  const flip = (side, { duration }) => {
    const from = resting;
    const base = Math.ceil(from / (Math.PI * 2)) * Math.PI * 2;
    const to = base + Math.PI * 2 * 5 + (side === "反面" ? Math.PI : 0);
    const wobble = (Math.random() - 0.5) * 0.5;
    resting = to % (Math.PI * 2);
    let started;
    return stage.animate((now) => {
      started ??= now;
      const t = Math.min(1, (now - started) / duration);
      const flight = Math.min(1, t / 0.82);
      const angle = from + (to - from) * (1 - Math.pow(1 - flight, 1.6));
      const arc = 0.95 * 4 * flight * (1 - flight);
      const settle =
        t > 0.82 ? 0.12 * Math.sin(((t - 0.82) / 0.18) * Math.PI) : 0;
      coin.rotation.set(angle, wobble * Math.sin(flight * Math.PI), 0);
      coin.position.set(
        0,
        Math.max(lowest(angle), THICKNESS / 2) + arc + settle,
        0,
      );
      if (t >= 1) {
        coin.rotation.set(to, 0, 0);
        coin.position.y = THICKNESS / 2;
      }
      return t < 1;
    });
  };

  return {
    show,
    flip,
    dispose: () => {
      geometry.dispose();
      stage.dispose();
    },
  };
}
