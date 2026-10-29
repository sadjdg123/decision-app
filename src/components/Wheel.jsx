import { useEffect, useLayoutEffect, useRef } from "react";
import { SPIN_DURATION, wheelColor } from "../constants";
import { mod360, totalWeight, triggerVibration } from "../utils";
import { playTick } from "../sound";

const C = 200;
const R = 186;
const HUB = 50;
const LIGHTS = 24;

function point(angle, radius) {
  const radians = (angle * Math.PI) / 180;
  return [C + Math.sin(radians) * radius, C - Math.cos(radians) * radius];
}

function slicePath(start, size) {
  if (size >= 359.999)
    return `M${C} ${C - R}A${R} ${R} 0 1 1 ${C - 0.01} ${C - R}Z`;
  const [x1, y1] = point(start, R);
  const [x2, y2] = point(start + size, R);
  return `M${C} ${C}L${x1} ${y1}A${R} ${R} 0 ${size > 180 ? 1 : 0} 1 ${x2} ${y2}Z`;
}

function fitLabel(name, size) {
  const arc = (2 * Math.PI * 128 * size) / 360;
  const fontSize = Math.min(19, arc * 0.52);
  const room = R - 18 - HUB - 6;
  const maxChars = Math.max(1, Math.floor(room / fontSize));
  const chars = Array.from(name);
  const text =
    chars.length > maxChars
      ? `${chars.slice(0, Math.max(1, maxChars - 1)).join("")}…`
      : name;
  return { fontSize, text };
}

// Index of the slice currently under the top pointer.
function sliceAt(rotation, segments) {
  const angle = mod360(-rotation);
  const index = segments.findIndex(
    (s) => angle >= s.start && angle < s.start + s.size,
  );
  return index < 0 ? segments.length - 1 : index;
}

export default function Wheel({
  items,
  spinning,
  selected,
  rotation,
  onSpin,
  justStopped,
  reducedMotion,
}) {
  const discRef = useRef(null);
  const pointerRef = useRef(null);
  const shown = useRef(rotation);
  const weightTotal = totalWeight(items);
  const segments = items.map((item, index) => ({
    ...item,
    start: (totalWeight(items.slice(0, index)) / weightTotal) * 360,
    size: (item.weight / weightTotal) * 360,
    color: wheelColor(index, items.length),
  }));
  const segmentsRef = useRef(segments);
  useLayoutEffect(() => {
    segmentsRef.current = segments;
  });
  const showWinner = Boolean(selected) && !spinning;

  // Drive the spin frame by frame so the pointer can flick at every slice boundary.
  useEffect(() => {
    const disc = discRef.current;
    const from = shown.current;
    const to = rotation;
    const place = (angle) => {
      shown.current = angle;
      disc.style.transform = `rotate(${angle}deg)`;
    };
    if (!spinning || reducedMotion || from === to) {
      place(to);
      return undefined;
    }
    let frame = 0;
    let last = sliceAt(from, segmentsRef.current);
    let started = 0;
    const step = (now) => {
      started ||= now;
      const t = Math.min(1, (now - started) / SPIN_DURATION);
      const eased = 1 - Math.pow(1 - t, 4);
      const angle = from + (to - from) * eased;
      place(angle);
      const current = sliceAt(angle, segmentsRef.current);
      if (current !== last && segmentsRef.current.length > 1) {
        last = current;
        playTick();
        pointerRef.current?.animate?.(
          [{ transform: "rotate(-22deg)" }, { transform: "rotate(0deg)" }],
          { duration: 140 + 260 * eased, easing: "ease-out" },
        );
        if (t > 0.75) triggerVibration(6);
      }
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [rotation, spinning, reducedMotion]);

  return (
    <div
      className={`wheel ${spinning ? "is-spinning" : ""} ${justStopped ? "is-winner" : ""}`}
    >
      <div className="wheel-glow" aria-hidden="true" />
      <svg className="wheel-frame" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe9a8" />
            <stop offset=".45" stopColor="#f2b134" />
            <stop offset="1" stopColor="#a8621a" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r="199" fill="url(#rim)" />
        <circle cx={C} cy={C} r="191" fill="#1a1530" />
        {Array.from({ length: LIGHTS }, (_, i) => {
          const [x, y] = point((i * 360) / LIGHTS, 195);
          return (
            <circle
              key={i}
              className={`bulb ${i % 2 ? "bulb--odd" : ""}`}
              cx={x}
              cy={y}
              r="3.2"
            />
          );
        })}
      </svg>
      <div className="wheel-disc" ref={discRef}>
        <svg viewBox="0 0 400 400" aria-hidden="true">
          {segments.length ? (
            segments.map((segment, index) => {
              const label = fitLabel(segment.name, segment.size);
              const center = segment.start + segment.size / 2;
              // Flip labels on the left half so they never read upside down.
              const flip = center > 180;
              const won = showWinner && segment.name === selected;
              return (
                <g
                  key={index}
                  className={`slice ${showWinner ? (won ? "is-won" : "is-dim") : ""}`}
                >
                  <path
                    d={slicePath(segment.start, segment.size)}
                    fill={segment.color}
                    stroke="#1a1530"
                    strokeWidth={segments.length > 1 ? 2.5 : 0}
                    strokeLinejoin="round"
                  />
                  {label.fontSize >= 9 && (
                    <text
                      x={flip ? C - R + 18 : C + R - 18}
                      y={C}
                      transform={`rotate(${flip ? center + 90 : center - 90} ${C} ${C})`}
                      textAnchor={flip ? "start" : "end"}
                      dominantBaseline="central"
                      fontSize={label.fontSize}
                    >
                      {label.text}
                    </text>
                  )}
                </g>
              );
            })
          ) : (
            <circle cx={C} cy={C} r={R} fill="#2a2446" />
          )}
          <circle
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".18"
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <div className="wheel-pointer" ref={pointerRef} aria-hidden="true">
        <svg viewBox="0 0 40 52">
          <path
            d="M20 50 4 18a16 16 0 1 1 32 0Z"
            fill="#fff4d6"
            stroke="#1a1530"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="17" r="6" fill="#ff6b6b" />
        </svg>
      </div>
      <button
        type="button"
        className="wheel-hub"
        onClick={onSpin}
        disabled={!items.length || spinning}
        aria-label={spinning ? "转盘正在选择" : "开始转盘"}
      >
        {spinning ? "···" : "GO"}
      </button>
    </div>
  );
}
