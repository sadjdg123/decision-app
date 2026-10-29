import { useEffect, useRef, useState } from "react";
import { supportsWebGL } from "../three/support";

// Loads a three.js scene lazily into a canvas; `load` must resolve to a create(canvas) function.
export function useScene(load) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(null);
  const [status, setStatus] = useState(() =>
    supportsWebGL() ? "loading" : "failed",
  );
  useEffect(() => {
    if (status === "failed") return undefined;
    let disposed = false;
    load()
      .then((create) => {
        if (disposed) return;
        sceneRef.current = create(canvasRef.current);
        setStatus("ready");
      })
      .catch(() => !disposed && setStatus("failed"));
    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // The scene is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { canvasRef, sceneRef, status };
}
