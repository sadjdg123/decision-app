import { useEffect, useRef, useState } from "react";
import { triggerVibration } from "../utils";
import { Button, Confetti, Icon, Panel } from "./UI";

export default function CoinPage({ addHistory, reducedMotion }) {
  const [result, setResult] = useState("");
  const [flipping, setFlipping] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
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
    triggerVibration(25);
    timers.current.push(
      window.setTimeout(
        () => {
          setResult(next);
          addHistory("抛硬币", next);
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
    <Panel className="solo-panel coin-panel">
      <div className="solo-heading">
        <span className="eyebrow">TWO SIDES. ONE ANSWER.</span>
        <h2>
          给犹豫，一个<span>答案。</span>
        </h2>
        <p className="muted">正面还是反面？先说好，再让硬币落下来。</p>
      </div>
      <div className={`coin-stage ${flipping ? "is-flipping" : ""}`}>
        <div className="coin-orbit" />
        <div className="coin-shadow" />
        <div
          className="coin-body"
          data-testid="coin-body"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transitionDuration: reducedMotion ? "0ms" : "1400ms",
          }}
        >
          <div className="coin-face coin-front">
            <span className="coin-detail">DECISION CLUB · CHANCE</span>
            <strong>正</strong>
            <small>HEADS</small>
          </div>
          <div className="coin-face coin-back">
            <span className="coin-detail">DECISION CLUB · CHANCE</span>
            <strong>反</strong>
            <small>TAILS</small>
          </div>
        </div>
      </div>
      <div
        className={`result-card solo-result ${result ? "has-result" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Confetti active={celebrating && !reducedMotion} />
        <span className="eyebrow">YOUR ANSWER</span>
        <strong>
          {flipping ? "硬币还在空中…" : result || "先给两面各分配一个选择"}
        </strong>
      </div>
      <Button onClick={flip} disabled={flipping} className="solo-action">
        <Icon name="coin" />
        {flipping ? "等待落定…" : "抛一次硬币"}
        <Icon name="arrow" />
      </Button>
      <p className="draw-note">两面等概率 · 每次独立抽选 · 自动记录结果</p>
    </Panel>
  );
}
