import { useEffect, useRef } from "react";
import { REEL_DURATION } from "../constants";
import { mod360, triggerVibration } from "../utils";
import { playTick } from "../sound";
import { STEP, idleFaces } from "../reel";

// Decelerate, then nudge a little past the line and snap back, like a reel hitting its detent.
const travel = (t) => 1 - Math.pow(1 - Math.min(1, t / 0.86), 3);
const rebound = (t) =>
  t < 0.8 ? 0 : 0.22 * Math.sin(Math.PI * Math.min(1, (t - 0.8) / 0.2));

export default function SlotReel({
  reel,
  names,
  spinning,
  selected,
  reducedMotion,
}) {
  const drumRef = useRef(null);
  const shown = useRef(reel.target * STEP);
  const faces = reel.faces ?? idleFaces(names, reel.target);

  useEffect(() => {
    const drum = drumRef.current;
    const place = (angle) => {
      shown.current = angle;
      drum.style.transform = `translateZ(calc(-1 * var(--radius))) rotateX(${angle}deg)`;
    };
    const from = shown.current;
    const aligned = from + mod360(reel.target * STEP - from);
    if (!spinning || !reel.spin || reducedMotion) {
      place(aligned);
      return undefined;
    }
    const to = aligned + 360 * 3;
    let frame = 0;
    let started = 0;
    let last = Math.round(from / STEP);
    const step = (now) => {
      started ||= now;
      const t = Math.min(1, (now - started) / REEL_DURATION);
      const angle = from + (to - from) * travel(t) + STEP * rebound(t);
      place(angle);
      const face = Math.round(angle / STEP);
      if (face !== last) {
        last = face;
        playTick();
        if (t > 0.7) triggerVibration(5);
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reel, spinning, reducedMotion]);

  return (
    <div
      className={`reel ${spinning ? "is-spinning" : ""} ${selected && !spinning ? "has-result" : ""}`}
    >
      <div className="reel-window">
        <div className="reel-drum" ref={drumRef}>
          {faces.map((name, i) => (
            <span
              key={i}
              className={`reel-face ${i === reel.target ? "is-target" : ""}`}
              style={{
                transform: `rotateX(${-i * STEP}deg) translateZ(var(--radius))`,
              }}
            >
              {name}
            </span>
          ))}
        </div>
        <i className="reel-shade" aria-hidden="true" />
        <i className="reel-mark reel-mark--left" aria-hidden="true" />
        <i className="reel-mark reel-mark--right" aria-hidden="true" />
      </div>
    </div>
  );
}
