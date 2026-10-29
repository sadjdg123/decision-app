import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { SPIN_DURATION, wheelColor } from "../constants";
import { mod360, totalWeight, triggerVibration } from "../utils";
import { playTick } from "../sound";

const C = 200;
const R = 186;
const HUB = 50;

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
  const id = useId().replace(/:/g, "");

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
      <div className="wheel-shadow" aria-hidden="true" />
      <svg className="wheel-frame" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6ead3" />
            <stop offset=".35" stopColor="#c7a97e" />
            <stop offset=".6" stopColor="#f0e0c2" />
            <stop offset="1" stopColor="#6f5a40" />
          </linearGradient>
          <linearGradient id={`${id}-bezel-in`} x1="1" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#f2e2c4" />
            <stop offset="1" stopColor="#5c4a35" />
          </linearGradient>
        </defs>
        <circle cx={C} cy={C} r="199" fill={`url(#${id}-bezel)`} />
        <circle cx={C} cy={C} r="191" fill={`url(#${id}-bezel-in)`} />
        <circle cx={C} cy={C} r="188.5" fill="#0c0c0e" />
      </svg>
      <div className="wheel-disc" ref={discRef}>
        <svg viewBox="0 0 400 400" aria-hidden="true">
          <defs>
            <radialGradient id={`${id}-peg`} cx=".35" cy=".3" r=".8">
              <stop offset="0" stopColor="#fff8ea" />
              <stop offset=".5" stopColor="#cfb284" />
              <stop offset="1" stopColor="#5f4c35" />
            </radialGradient>
          </defs>
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
                  />
                  {label.fontSize >= 9 && (
                    <text
                      x={flip ? C - R + 22 : C + R - 22}
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
            <circle cx={C} cy={C} r={R} fill="#26262b" />
          )}
          {segments.length > 1 &&
            segments.map((segment) => {
              const [x1, y1] = point(segment.start, HUB + 4);
              const [x2, y2] = point(segment.start, R);
              return (
                <line
                  key={`d${segment.start}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className="divider"
                />
              );
            })}
          <circle cx={C} cy={C} r={R - 0.5} className="disc-edge" />
          {segments.length > 1 &&
            segments.map((segment) => {
              const [x, y] = point(segment.start, R - 7);
              return (
                <circle
                  key={`p${segment.start}`}
                  cx={x}
                  cy={y}
                  r="4.2"
                  fill={`url(#${id}-peg)`}
                  className="peg"
                />
              );
            })}
        </svg>
      </div>
      <svg className="wheel-light" viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-shade`} cx=".5" cy=".5" r=".5">
            <stop offset=".62" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".38" />
          </radialGradient>
          <radialGradient id={`${id}-shine`} cx=".3" cy=".18" r=".75">
            <stop offset="0" stopColor="#fff" stopOpacity=".26" />
            <stop offset=".55" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx={C} cy={C} r="187" fill={`url(#${id}-shade)`} />
        <circle cx={C} cy={C} r="187" fill={`url(#${id}-shine)`} />
      </svg>
      <div className="wheel-pointer" ref={pointerRef} aria-hidden="true">
        <svg viewBox="0 0 30 62">
          <defs>
            <linearGradient id={`${id}-flap`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#8a7151" />
              <stop offset=".45" stopColor="#f6ead3" />
              <stop offset="1" stopColor="#a88b63" />
            </linearGradient>
          </defs>
          <path
            d="M5.5 14a9.5 9.5 0 0 1 19 0L16.6 57.5q-1.6 3-3.2 0Z"
            fill={`url(#${id}-flap)`}
            stroke="#3d3123"
            strokeWidth=".8"
          />
          <circle cx="15" cy="14" r="4" fill="#1a1a1d" />
          <circle cx="14" cy="13" r="1.3" fill="#fff" fillOpacity=".45" />
        </svg>
      </div>
      <button
        type="button"
        className="wheel-hub"
        onClick={onSpin}
        disabled={!items.length || spinning}
        aria-label={spinning ? "转盘正在选择" : "开始转盘"}
      >
        <span>{spinning ? "···" : "GO"}</span>
      </button>
    </div>
  );
}
