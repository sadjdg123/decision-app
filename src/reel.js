// Planning for the slot drum: which name sits on which of its faces.
export const FACES = 14;
export const STEP = 360 / FACES;

const near = (a, b) => {
  const d = Math.abs(a - b) % FACES;
  return Math.min(d, FACES - d) <= 2;
};

// Drum with a "?" at the front and the candidate names around it.
export function idleFaces(names, front) {
  const faces = Array.from({ length: FACES }, (_, i) => {
    if (!names.length) return "";
    // Signed distance from the front face, so the neighbours above and below differ.
    const offset = ((i - front + FACES + FACES / 2) % FACES) - FACES / 2;
    return names[((offset % names.length) + names.length) % names.length];
  });
  faces[front] = "?";
  return faces;
}

export function idleReel(previous) {
  return {
    id: (previous?.id ?? 0) + 1,
    faces: null,
    target: previous?.target ?? 0,
    spin: false,
  };
}

// Refill the faces hidden from view, then put the result on a face that is out of sight now.
export function planReel(previous, names, pick, result) {
  const front = previous.target;
  const base = previous.faces ?? idleFaces(names, front);
  const faces = base.map((name, i) => (near(i, front) ? name : pick()));
  const target = (front + 5 + Math.floor(Math.random() * 5)) % FACES;
  faces[target] = result;
  return { id: previous.id + 1, faces, target, spin: true };
}
