import { useEffect, useMemo, useRef, useState } from "react";
import { REEL_DURATION, SPIN_DURATION } from "../constants";
import {
  sanitizeItems,
  totalWeight,
  pickWeightedIndex,
  pickWeightedName,
  getFinalRotationForTarget,
  triggerVibration,
} from "../utils";
import { playStart, playWin } from "../sound";
import { Button, Confetti, Icon, Panel } from "./UI";
import Wheel from "./Wheel";
import SlotReel from "./SlotReel";
import OptionEditor from "./OptionEditor";
import TemplatePicker from "./TemplatePicker";

const idleReel = (id) => ({ id, strip: ["", "?", ""], target: 1 });

export default function DrawPage({
  mode,
  data,
  setData,
  addHistory,
  reducedMotion,
}) {
  const isFood = mode === "food";
  const templateKey = isFood ? "foodTemplates" : "peopleTemplates";
  const templates = data[templateKey];
  const [activeTemplate, setActiveTemplate] = useState(
    () => Object.keys(templates)[0] || "",
  );
  const [items, setItems] = useState(() =>
    sanitizeItems(templates[Object.keys(templates)[0]] || []),
  );
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify(items),
  );
  const [selected, setSelected] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [reel, setReel] = useState(() => idleReel(0));
  const [round, setRound] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [justStopped, setJustStopped] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const timers = useRef([]);
  const busy = useRef(false);
  const cleanItems = useMemo(() => sanitizeItems(items), [items]);
  const weightTotal = totalWeight(cleanItems);
  const isDirty = JSON.stringify(cleanItems) !== savedSnapshot;

  useEffect(() => {
    const handles = timers.current;
    return () => handles.forEach(window.clearTimeout);
  }, []);

  const schedule = (callback, delay) => {
    timers.current.push(window.setTimeout(callback, delay));
  };
  const finish = (result) => {
    busy.current = false;
    setSpinning(false);
    setSelected(result);
    setPendingResult({ type: isFood ? "吃什么" : "谁请客", result });
    setRound((n) => n + 1);
    setJustStopped(true);
    playWin();
    triggerVibration([30, 40, 30]);
    schedule(() => setJustStopped(false), 1800);
  };
  const begin = () => {
    if (busy.current || !weightTotal) return false;
    busy.current = true;
    timers.current.forEach(window.clearTimeout);
    timers.current = [];
    setSpinning(true);
    setSelected("");
    setPendingResult(null);
    setJustStopped(false);
    playStart();
    triggerVibration(25);
    return true;
  };
  const spin = () => {
    if (!begin()) return;
    const target = pickWeightedIndex(cleanItems, weightTotal);
    const start =
      (totalWeight(cleanItems.slice(0, target)) / weightTotal) * 360;
    const size = (cleanItems[target].weight / weightTotal) * 360;
    // Land somewhere inside the slice, never on its edge, so it does not look staged.
    const landing = start + size * (0.5 + (Math.random() - 0.5) * 0.7);
    setRotation((current) => getFinalRotationForTarget(current, landing));
    schedule(
      () => finish(cleanItems[target].name),
      reducedMotion ? 100 : SPIN_DURATION,
    );
  };
  const reelSpin = () => {
    if (!begin()) return;
    const result = pickWeightedName(cleanItems, weightTotal);
    const pick = () => pickWeightedName(cleanItems, weightTotal);
    const filler = Array.from({ length: 26 }, pick);
    const current = selected || "?";
    setReel((r) => ({
      id: r.id + 1,
      strip: [pick(), current, ...filler, result, pick()],
      target: filler.length + 2,
    }));
    schedule(() => finish(result), reducedMotion ? 100 : REEL_DURATION);
  };
  const resetResult = () => {
    setSelected("");
    setPendingResult(null);
    setJustStopped(false);
    setReel((r) => idleReel(r.id + 1));
  };
  const setEditorItems = (updater) => {
    if (busy.current) return;
    setItems(updater);
    resetResult();
  };
  const mayDiscard = () =>
    !isDirty || window.confirm("当前模板有未保存的修改，确定放弃这些修改？");
  const loadTemplate = (name, list) => {
    setActiveTemplate(name);
    setItems(list);
    setSavedSnapshot(JSON.stringify(list));
    resetResult();
    setRound(0);
  };
  const choose = (name) => {
    if (busy.current || name === activeTemplate || !mayDiscard()) return;
    loadTemplate(name, sanitizeItems(templates[name] || []));
  };
  const newTemplate = (name) => {
    if (busy.current || Object.hasOwn(templates, name) || !mayDiscard())
      return false;
    setData((current) => ({
      ...current,
      [templateKey]: { ...current[templateKey], [name]: [] },
    }));
    loadTemplate(name, []);
  };
  const saveTemplate = (name) => {
    if (busy.current) return;
    setData((current) => ({
      ...current,
      [templateKey]: { ...current[templateKey], [name]: cleanItems },
    }));
    setItems(cleanItems);
    setActiveTemplate(name);
    setSavedSnapshot(JSON.stringify(cleanItems));
  };
  const deleteTemplate = (name) => {
    if (busy.current) return;
    const nextTemplates = { ...templates };
    delete nextTemplates[name];
    const nextName = Object.keys(nextTemplates)[0] || "";
    setData((current) => ({ ...current, [templateKey]: nextTemplates }));
    loadTemplate(nextName, sanitizeItems(nextTemplates[nextName] || []));
  };
  const confirm = () => {
    if (!pendingResult || busy.current) return;
    addHistory(pendingResult.type, pendingResult.result);
    setPendingResult(null);
  };

  const status = spinning
    ? "抽选中"
    : selected
      ? pendingResult
        ? "待确认"
        : "已记下"
      : "准备就绪";

  return (
    <div className="draw-layout">
      <Panel className="stage-panel">
        <div className="stage-head">
          <div>
            <h2>
              {isFood ? (
                <>
                  今天吃<em>什么</em>？
                </>
              ) : (
                <>
                  这顿<em>谁请客</em>？
                </>
              )}
            </h2>
            <p className="muted">
              {isFood
                ? "把纠结交给转盘，把胃口留给自己。"
                : "名单备好，今晚的幸运嘉宾即将揭晓。"}
            </p>
          </div>
          <span className="round-badge" aria-label={`第 ${round + 1} 轮`}>
            <small>第</small>
            {round + 1}
            <small>轮</small>
          </span>
        </div>
        <div className="stage-meta">
          <span className="pill">
            <Icon name="list" size={14} />
            {activeTemplate || "未命名名单"}
          </span>
          <span className="muted">
            {cleanItems.length} 个选项 · 共 {weightTotal} 票
          </span>
        </div>

        <div className="stage">
          {isFood ? (
            <Wheel
              items={cleanItems}
              spinning={spinning}
              selected={selected}
              rotation={rotation}
              onSpin={spin}
              justStopped={justStopped}
              reducedMotion={reducedMotion}
            />
          ) : (
            <SlotReel
              reel={reel}
              spinning={spinning}
              selected={selected}
              reducedMotion={reducedMotion}
            />
          )}
        </div>

        <div
          className={`result ${selected && !spinning ? "has-result" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Confetti active={justStopped && !reducedMotion} />
          <span className="result-label">
            {spinning ? "转动中" : selected ? "就是它" : "结果"}
            <b
              className={`result-status result-status--${pendingResult ? "pending" : selected ? "done" : "idle"}`}
            >
              {status}
            </b>
          </span>
          <strong key={selected || (spinning ? "spin" : "idle")}>
            {spinning
              ? "答案正在路上…"
              : selected ||
                (cleanItems.length
                  ? isFood
                    ? "点中间的 GO 开转"
                    : "拉一下，看看是谁"
                  : "先在下面加几个选项")}
          </strong>
        </div>

        <div className="actions">
          <Button
            onClick={isFood ? spin : reelSpin}
            disabled={!weightTotal || spinning}
            className="action-main"
          >
            {spinning
              ? "正在选择…"
              : round
                ? "再来一次"
                : isFood
                  ? "转一下"
                  : "开始抽"}
            <Icon name="arrow" />
          </Button>
          <Button
            variant="ghost"
            onClick={confirm}
            disabled={!pendingResult || spinning}
          >
            <Icon name="check" />
            就它了
          </Button>
        </div>
        <p className="footnote">
          {round >= 4
            ? "一直想重抽？也许你心里早有答案了。"
            : "票数越多越容易中 · 点「就它了」记入足迹"}
        </p>
      </Panel>

      <button
        type="button"
        className="edit-toggle"
        aria-expanded={editorOpen}
        onClick={() => setEditorOpen((open) => !open)}
      >
        <Icon name="edit" size={18} />
        <span>
          编辑{isFood ? "店铺" : "名单"}
          <small>
            {activeTemplate || "未命名"} · {cleanItems.length} 个选项
            {isDirty && " · 未保存"}
          </small>
        </span>
        <Icon name="chevron" size={18} />
      </button>

      <aside className={`settings ${editorOpen ? "is-open" : ""}`}>
        <TemplatePicker
          title={isFood ? "店铺模板" : "人名模板"}
          templates={templates}
          activeName={activeTemplate}
          isDirty={isDirty}
          onChoose={choose}
          onNew={newTemplate}
          onSave={saveTemplate}
          onDelete={deleteTemplate}
          disabled={spinning}
        />
        <OptionEditor
          items={items}
          setItems={setEditorItems}
          placeholder={isFood ? "加一家想吃的店…" : "加一位今晚的朋友…"}
          templates={templates}
          disabled={spinning}
        />
      </aside>
    </div>
  );
}
