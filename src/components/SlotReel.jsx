import { REEL_DURATION } from "../constants";

// One reel window showing three rows; the strip scrolls until `target` sits in the middle row.
export default function SlotReel({ reel, spinning, selected, reducedMotion }) {
  const animate = spinning && !reducedMotion;
  const offset = `calc(var(--row) * ${-(reel.target - 1)})`;
  return (
    <div
      className={`reel ${spinning ? "is-spinning" : ""} ${selected && !spinning ? "has-result" : ""}`}
    >
      <div className="reel-window">
        <div
          key={reel.id}
          className={`reel-strip ${animate ? "is-rolling" : ""}`}
          style={{
            "--reel-end": offset,
            "--reel-duration": `${REEL_DURATION}ms`,
            transform: animate ? undefined : `translateY(${offset})`,
          }}
        >
          {reel.strip.map((name, i) => (
            <span
              className={`reel-row ${i === reel.target ? "is-target" : ""}`}
              key={i}
            >
              {name}
            </span>
          ))}
        </div>
        <i className="reel-line" aria-hidden="true" />
      </div>
    </div>
  );
}
