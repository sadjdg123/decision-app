import { useEffect, useRef, useState } from "react";
import { triggerVibration } from "../utils";
import { playStart, playWin } from "../sound";
import { Button, Confetti, Icon, Panel } from "./UI";
import { useScene } from "./Scene3D";

const FLIP_DURATION = 1600;
const loadCoin = () =>
  import("../three/coin3d").then((module) => module.createCoinScene);

export default function CoinPage({ addHistory, reducedMotion }) {
  const [result, setResult] = useState("");
  const [flipping, setFlipping] = useState(false);
  const [side, setSide] = useState("正面");
  const [celebrating, setCelebrating] = useState(false);
  const [labels, setLabels] = useState({ 正面: "", 反面: "" });
  const describe = (side) =>
    labels[side].trim() ? `${side} · ${labels[side].trim()}` : side;
  const timers = useRef([]);
  const busy = useRef(false);
  const { canvasRef, sceneRef, status } = useScene(loadCoin);
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
    // Decide the landing side first, so the coin on screen and the record always agree.
    if (reducedMotion) sceneRef.current?.show(next);
    else sceneRef.current?.flip(next, { duration: FLIP_DURATION });
    playStart();
    triggerVibration(25);
    timers.current.push(
      window.setTimeout(
        () => {
          setResult(next);
          setSide(next);
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
        reducedMotion ? 100 : FLIP_DURATION,
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
      <div className={`table3d table3d--coin is-${status}`}>
        {status === "failed" ? (
          <div className={`flat-coin ${side === "反面" ? "is-tails" : ""}`}>
            {flipping ? "…" : side === "反面" ? "反" : "正"}
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={flipping ? "硬币在空中翻转" : `硬币：${side}朝上`}
          />
        )}
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
