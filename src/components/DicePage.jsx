import { useEffect, useRef, useState } from "react";
import { rollDiceValues, triggerVibration } from "../utils";
import { Button, Confetti, Icon, Panel } from "./UI";

const FACE_PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
// Faces are paired to sum to seven. Orientations are inverse to each face's transform.
const FACES = [
  { value: 1, transform: "translateZ(var(--dice-depth))", orientation: [0, 0] },
  {
    value: 2,
    transform: "rotateY(90deg) translateZ(var(--dice-depth))",
    orientation: [0, -90],
  },
  {
    value: 3,
    transform: "rotateX(-90deg) translateZ(var(--dice-depth))",
    orientation: [90, 0],
  },
  {
    value: 4,
    transform: "rotateX(90deg) translateZ(var(--dice-depth))",
    orientation: [-90, 0],
  },
  {
    value: 5,
    transform: "rotateY(-90deg) translateZ(var(--dice-depth))",
    orientation: [0, 90],
  },
  {
    value: 6,
    transform: "rotateY(180deg) translateZ(var(--dice-depth))",
    orientation: [0, 180],
  },
];
function Dice({ pose, index, rolling, reducedMotion, value }) {
  return (
    <div
      className={`dice-object ${rolling ? "is-rolling" : ""}`}
      role="img"
      aria-label={rolling ? "骰子正在滚动" : `骰子 ${index + 1}：${value} 点`}
    >
      <div
        className="dice-cube"
        data-testid={`dice-cube-${index}`}
        style={{
          transform: `rotateX(${pose[0]}deg) rotateY(${pose[1]}deg)`,
          transitionDuration: reducedMotion ? "0ms" : `${1050 + index * 55}ms`,
        }}
      >
        {FACES.map((face) => (
          <div
            className="dice-face"
            key={face.value}
            data-face={face.value}
            style={{ transform: face.transform }}
          >
            {FACE_PIPS[face.value].map((pip) => (
              <i
                key={pip}
                className={`pip ${face.value === 1 ? "pip--one" : ""}`}
                style={{
                  gridArea: `${Math.floor(pip / 3) + 1} / ${(pip % 3) + 1}`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
export default function DicePage({ addHistory, reducedMotion }) {
  const [count, setCount] = useState(1);
  const [values, setValues] = useState([1]);
  const [poses, setPoses] = useState([[0, 0]]);
  const [rolling, setRolling] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timers = useRef([]);
  const busy = useRef(false);
  useEffect(() => {
    const handles = timers.current;
    return () => handles.forEach(window.clearTimeout);
  }, []);
  const roll = () => {
    if (busy.current) return;
    busy.current = true;
    setRolling(true);
    setHasResult(false);
    setCelebrating(false);
    timers.current.forEach(window.clearTimeout);
    timers.current.length = 0;
    const nextValues = rollDiceValues(count);
    setPoses((current) =>
      nextValues.map((value, i) => {
        const [x, y] = FACES[value - 1].orientation;
        return [
          (Math.floor((current[i]?.[0] || 0) / 360) + 3) * 360 + x,
          (Math.floor((current[i]?.[1] || 0) / 360) + 4) * 360 + y,
        ];
      }),
    );
    triggerVibration(25);
    timers.current.push(
      window.setTimeout(
        () => {
          const total = nextValues.reduce((sum, n) => sum + n, 0);
          setValues(nextValues);
          setRolling(false);
          busy.current = false;
          setHasResult(true);
          setCelebrating(true);
          addHistory(
            "掷骰子",
            count === 1
              ? String(total)
              : `${nextValues.join(" + ")} = ${total}`,
          );
          triggerVibration([30, 40, 30]);
          timers.current.push(
            window.setTimeout(() => setCelebrating(false), 1600),
          );
        },
        reducedMotion ? 100 : 1050 + (count - 1) * 55,
      ),
    );
  };
  const changeCount = (delta) => {
    if (busy.current) return;
    const next = Math.max(1, Math.min(6, count + delta));
    setCount(next);
    setValues(Array(next).fill(1));
    setPoses(Array.from({ length: next }, () => [0, 0]));
    setHasResult(false);
    setCelebrating(false);
  };
  const total = values.reduce((sum, n) => sum + n, 0);
  return (
    <Panel className="solo-panel dice-panel">
      <div className="solo-heading">
        <span className="eyebrow">ROLL WITH THE UNEXPECTED</span>
        <h2>
          好运，掷地<span>有声。</span>
        </h2>
        <p className="muted">一个小决定，或者一场游戏。让点数说话。</p>
      </div>
      <div className="dice-count">
        <Button
          variant="soft"
          onClick={() => changeCount(-1)}
          disabled={rolling || count === 1}
          aria-label="减少骰子"
        >
          −
        </Button>
        <span>
          <b>{count}</b> 个骰子
        </span>
        <Button
          variant="soft"
          onClick={() => changeCount(1)}
          disabled={rolling || count === 6}
          aria-label="增加骰子"
        >
          +
        </Button>
      </div>
      <div className="dice-stage">
        {poses.map((pose, i) => (
          <Dice
            key={i}
            pose={pose}
            index={i}
            rolling={rolling}
            reducedMotion={reducedMotion}
            value={values[i]}
          />
        ))}
      </div>
      <div
        className={`result-card solo-result ${hasResult ? "has-result" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Confetti active={celebrating && !reducedMotion} />
        <span className="eyebrow">
          {count > 1 ? "THE TOTAL" : "YOUR NUMBER"}
        </span>
        <strong>
          {rolling
            ? "好运正在翻滚…"
            : hasResult
              ? count === 1
                ? `${total} 点`
                : `${values.join(" + ")} = ${total}`
              : "准备好，就掷一次"}
        </strong>
      </div>
      <Button onClick={roll} disabled={rolling} className="solo-action">
        <Icon name="dice" />
        {rolling ? "等待落定…" : "掷一次骰子"}
        <Icon name="arrow" />
      </Button>
      <p className="draw-note">1–6 个骰子 · 每面等概率 · 自动记录结果</p>
    </Panel>
  );
}
