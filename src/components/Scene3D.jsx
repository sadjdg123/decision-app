import { useEffect, useRef, useState } from "react";
import { supportsWebGL } from "../three/support";

// Loads a three.js scene into a canvas the first time `enabled` is true;
// `load` must resolve to a create(canvas) function.
export function useScene(load, enabled) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const started = useRef(false);
  const alive = useRef(true);
  const [status, setStatus] = useState(() =>
    supportsWebGL() ? "loading" : "failed",
  );
  useEffect(() => {
    if (!enabled || started.current || status === "failed") return;
    started.current = true;
    load()
      .then((create) => {
        if (!alive.current) return;
        sceneRef.current = create(canvasRef.current);
        setStatus("ready");
      })
      .catch(() => alive.current && setStatus("failed"));
  }, [enabled, load, status]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);
  return { canvasRef, sceneRef, status };
}
