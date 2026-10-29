import { useEffect, useRef, useState } from "react";
import { triggerVibration } from "../utils";
import { playStart, playWin } from "../sound";
import { Button, Confetti, Icon, Panel } from "./UI";

export default function CoinPage({ addHistory, reducedMotion }) {
  const [result, setResult] = useState("");
  const [flipping, setFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [labels, setLabels] = useState({ 正面: "", 反面: "" });
  const describe = (side) =>
    labels[side].trim() ? `${side} · ${labels[side].trim()}` : side;
  const timers = useRef([]);
  const busy = useRef(false);
  useEffect(() => {
    const handles = timers.current;
    return () => handles.forEach(window.clearTimeout);
  }, []);
  const flip = () => {
    if (busy.current) return;
    busy.current = true;
    setFlipping(true);
    setCelebrating(false);
    setResult("");
    timers.current.forEach(window.clearTimeout);
    timers.current.length = 0;
    const next = Math.random() < 0.5 ? "正面" : "反面";
    // Determine the destination before animating, so the visible face and history always agree.
    setRotation(
      (current) =>
        (Math.floor(current / 360) + 5) * 360 + (next === "反面" ? 180 : 0),
    );
    playStart();
    triggerVibration(25);
    timers.current.push(
      window.setTimeout(
        () => {
          setResult(next);
          addHistory("抛硬币", describe(next));
          playWin();
          setFlipping(false);
          busy.current = false;
          setCelebrating(true);
          triggerVibration([30, 40, 30]);
          timers.current.push(
            window.setTimeout(() => setCelebrating(false), 1600),
          );
        },
        reducedMotion ? 100 : 1400,
      ),
    );
  };
  return (
    <Panel className="solo-panel">
      <div className="solo-head">
        <h2>
          正面还是<em>反面</em>？
        </h2>
        <p className="muted">先说好两面各代表什么，再让硬币落下来。</p>
      </div>
      <div className="coin-labels">
        {["正面", "反面"].map((side) => (
          <label
            key={side}
            className={`coin-label coin-label--${side === "正面" ? "heads" : "tails"}`}
          >
            <span>{side === "正面" ? "正" : "反"}</span>
            <input
              value={labels[side]}
              maxLength={20}
              disabled={flipping}
              placeholder={side === "正面" ? "比如：去" : "比如：不去"}
              aria-label={`${side}代表什么`}
              onChange={(e) =>
                setLabels((current) => ({ ...current, [side]: e.target.value }))
              }
            />
          </label>
        ))}
      </div>
      <div className={`coin-stage ${flipping ? "is-flipping" : ""}`}>
        <div className="coin-shadow" />
        <div className="coin-flight">
          <div
            className="coin-body"
            data-testid="coin-body"
            style={{
              transform: `rotateY(${rotation}deg)`,
              transitionDuration: reducedMotion ? "0ms" : "1400ms",
            }}
          >
            <div
              className="coin-face coin-front"
              style={{
                visibility:
                  flipping || rotation % 360 === 0 ? "visible" : "hidden",
              }}
            >
              <strong>正</strong>
              <small>HEADS</small>
            </div>
            <div
              className="coin-face coin-back"
              style={{
                visibility:
                  flipping || rotation % 360 === 180 ? "visible" : "hidden",
              }}
            >
              <strong>反</strong>
              <small>TAILS</small>
            </div>
          </div>
        </div>
      </div>
      <div
        className={`result ${result ? "has-result" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Confetti active={celebrating && !reducedMotion} />
        <span className="result-label">结果</span>
        <strong key={result || (flipping ? "flip" : "idle")}>
          {flipping
            ? "硬币还在空中…"
            : result
              ? describe(result)
              : "点下面的按钮抛一次"}
        </strong>
      </div>
      <Button
        onClick={flip}
        disabled={flipping}
        className="action-main solo-action"
      >
        {flipping ? "等待落定…" : "抛硬币"}
        <Icon name="arrow" />
      </Button>
      <p className="footnote">两面各 50% · 落定后自动记录</p>
    </Panel>
  );
}
