import { useEffect, useRef, useState } from "react";
import { rollDiceValues, triggerVibration } from "../utils";
import { playStart, playWin } from "../sound";
import { Button, Confetti, Icon, Panel } from "./UI";
import { useScene } from "./Scene3D";

const ROLL_DURATION = 1500;
const ROLL_STAGGER = 70;
const IDLE_VALUES = [5, 3, 6, 2, 4, 1];
const FLAT_PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};
const loadDice = () =>
  import("../three/dice3d").then((module) => module.createDiceScene);

// Shown only when the device cannot draw WebGL.
function FlatDie({ value }) {
  return (
    <div className="flat-die" role="img" aria-label={`${value} 点`}>
      {FLAT_PIPS[value].map((pip) => (
        <i
          key={pip}
          className={value === 1 ? "is-one" : ""}
          style={{ gridArea: `${Math.floor(pip / 3) + 1} / ${(pip % 3) + 1}` }}
        />
      ))}
    </div>
  );
}

export default function DicePage({ addHistory, reducedMotion }) {
  const [count, setCount] = useState(1);
  const [values, setValues] = useState(IDLE_VALUES.slice(0, 1));
  const [rolling, setRolling] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timers = useRef([]);
  const busy = useRef(false);
  const { canvasRef, sceneRef, status } = useScene(loadDice);

  useEffect(() => {
    const handles = timers.current;
    return () => handles.forEach(window.clearTimeout);
  }, []);
  // Lay the dice out whenever the scene appears or the number of dice changes.
  useEffect(() => {
    if (status === "ready") sceneRef.current.layout(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, count]);

  const roll = () => {
    if (busy.current) return;
    busy.current = true;
    setRolling(true);
    setHasResult(false);
    setCelebrating(false);
    timers.current.forEach(window.clearTimeout);
    timers.current.length = 0;
    const nextValues = rollDiceValues(count);
    const duration = reducedMotion
      ? 100
      : ROLL_DURATION + (count - 1) * ROLL_STAGGER;
    if (reducedMotion) sceneRef.current?.layout(nextValues);
    else
      sceneRef.current?.roll(nextValues, {
        duration: ROLL_DURATION,
        stagger: ROLL_STAGGER,
      });
    playStart();
    triggerVibration(25);
    timers.current.push(
      window.setTimeout(() => {
        const total = nextValues.reduce((sum, n) => sum + n, 0);
        setValues(nextValues);
        setRolling(false);
        busy.current = false;
        setHasResult(true);
        setCelebrating(true);
        addHistory(
          "掷骰子",
          count === 1 ? String(total) : `${nextValues.join(" + ")} = ${total}`,
        );
        playWin();
        triggerVibration([30, 40, 30]);
        timers.current.push(
          window.setTimeout(() => setCelebrating(false), 1600),
        );
      }, duration),
    );
  };
  const changeCount = (delta) => {
    if (busy.current) return;
    const next = Math.max(1, Math.min(6, count + delta));
    setCount(next);
    setValues(IDLE_VALUES.slice(0, next));
    setHasResult(false);
    setCelebrating(false);
  };
  const total = values.reduce((sum, n) => sum + n, 0);
  return (
    <Panel className="solo-panel">
      <div className="solo-head">
        <h2>
          掷个<em>骰子</em>
        </h2>
        <p className="muted">小决定、桌游、比大小，让点数说话。</p>
      </div>
      <div className="stepper" role="group" aria-label="骰子数量">
        <button
          type="button"
          onClick={() => changeCount(-1)}
          disabled={rolling || count === 1}
          aria-label="减少骰子"
        >
          −
        </button>
        <span>
          <b>{count}</b> 个
        </span>
        <button
          type="button"
          onClick={() => changeCount(1)}
          disabled={rolling || count === 6}
          aria-label="增加骰子"
        >
          +
        </button>
      </div>
      <div className={`table3d table3d--dice is-${status}`}>
        {status === "failed" ? (
          <div className="flat-dice">
            {values.map((value, i) => (
              <FlatDie key={i} value={value} />
            ))}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={
              rolling ? "骰子正在滚动" : `骰子：${values.join("、")} 点`
            }
          />
        )}
      </div>
      <div
        className={`result ${hasResult ? "has-result" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Confetti active={celebrating && !reducedMotion} />
        <span className="result-label">{count > 1 ? "合计" : "点数"}</span>
        <strong
          key={hasResult ? values.join() : rolling ? "roll" : "idle"}
          className="tabular"
        >
          {rolling
            ? "骰子在滚…"
            : hasResult
              ? count === 1
                ? `${total} 点`
                : `${values.join(" + ")} = ${total}`
              : "点下面的按钮掷一次"}
        </strong>
      </div>
      <Button
        onClick={roll}
        disabled={rolling}
        className="action-main solo-action"
      >
        {rolling ? "等待落定…" : "掷骰子"}
        <Icon name="arrow" />
      </Button>
      <p className="footnote">1–6 个骰子 · 每面等概率 · 落定后自动记录</p>
    </Panel>
  );
}
