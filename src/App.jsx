import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_HISTORY, SLOT_INTERVAL, SPIN_DURATION, tabs } from "./constants";
import {
  loadData,
  saveData,
  sanitizeItems,
  totalWeight,
  pickWeightedIndex,
  pickWeightedName,
  getFinalRotationForTarget,
  triggerVibration,
  formatTime,
} from "./utils";
import { Button, Confetti, Icon, Panel } from "./components/UI";
import DicePage from "./components/DicePage";
import CoinPage from "./components/CoinPage";
import Wheel from "./components/Wheel";
import OptionEditor from "./components/OptionEditor";
import TemplatePicker from "./components/TemplatePicker";

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  return reduced;
}

function WheelPage({ mode, data, setData, addHistory, reducedMotion }) {
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
  const [slotItems, setSlotItems] = useState(["?", "?", "?"]);
  const [round, setRound] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [justStopped, setJustStopped] = useState(false);
  const timers = useRef({ timeouts: [], intervals: [] });
  const busy = useRef(false);
  const cleanItems = useMemo(() => sanitizeItems(items), [items]);
  const weightTotal = totalWeight(cleanItems);
  const isDirty = JSON.stringify(cleanItems) !== savedSnapshot;

  useEffect(() => {
    const handles = timers.current;
    return () => {
      handles.timeouts.forEach(window.clearTimeout);
      handles.intervals.forEach(window.clearInterval);
    };
  }, []);

  const clearTimers = () => {
    timers.current.timeouts.forEach(window.clearTimeout);
    timers.current.intervals.forEach(window.clearInterval);
    timers.current.timeouts = [];
    timers.current.intervals = [];
  };
  const schedule = (callback, delay) => {
    const id = window.setTimeout(callback, delay);
    timers.current.timeouts.push(id);
    return id;
  };
  const finish = (result) => {
    busy.current = false;
    setSpinning(false);
    setSelected(result);
    setPendingResult({ type: isFood ? "吃什么" : "谁请客", result });
    setRound((n) => n + 1);
    setJustStopped(true);
    triggerVibration([30, 40, 30]);
    schedule(() => setJustStopped(false), 1600);
  };
  const begin = () => {
    if (busy.current || !weightTotal) return false;
    busy.current = true;
    clearTimers();
    setSpinning(true);
    setSelected("");
    setPendingResult(null);
    setJustStopped(false);
    triggerVibration(25);
    return true;
  };
  const spin = () => {
    if (!begin()) return;
    const target = pickWeightedIndex(cleanItems, weightTotal);
    const center =
      ((totalWeight(cleanItems.slice(0, target)) +
        cleanItems[target].weight / 2) /
        weightTotal) *
      360;
    setRotation((current) => getFinalRotationForTarget(current, center));
    schedule(
      () => finish(cleanItems[target].name),
      reducedMotion ? 100 : SPIN_DURATION,
    );
  };
  const slotSpin = () => {
    if (!begin()) return;
    const result = pickWeightedName(cleanItems, weightTotal);
    if (reducedMotion) {
      setSlotItems([result, result, result]);
      schedule(() => finish(result), 100);
      return;
    }
    [0, 1, 2].forEach((column) => {
      const interval = window.setInterval(
        () =>
          setSlotItems((current) =>
            current.map((name, i) =>
              i === column ? pickWeightedName(cleanItems, weightTotal) : name,
            ),
          ),
        SLOT_INTERVAL + column * 30,
      );
      timers.current.intervals.push(interval);
      schedule(
        () => {
          window.clearInterval(interval);
          setSlotItems((current) =>
            current.map((name, i) => (i === column ? result : name)),
          );
        },
        950 + column * 350,
      );
    });
    schedule(() => finish(result), 1700);
  };
  const resetResult = () => {
    setSelected("");
    setPendingResult(null);
    setJustStopped(false);
    setSlotItems(["?", "?", "?"]);
    setRotation(0);
  };
  const setEditorItems = (updater) => {
    if (busy.current) return;
    setItems(updater);
    resetResult();
  };
  const mayDiscard = () =>
    !isDirty || window.confirm("当前模板有未保存的修改，确定放弃这些修改？");
  const choose = (name) => {
    if (busy.current || name === activeTemplate || !mayDiscard()) return;
    const next = sanitizeItems(templates[name] || []);
    setActiveTemplate(name);
    setItems(next);
    setSavedSnapshot(JSON.stringify(next));
    resetResult();
    setRound(0);
  };
  const newTemplate = (name) => {
    if (busy.current || Object.hasOwn(templates, name) || !mayDiscard())
      return false;
    setData((current) => ({
      ...current,
      [templateKey]: { ...current[templateKey], [name]: [] },
    }));
    setActiveTemplate(name);
    setItems([]);
    setSavedSnapshot("[]");
    resetResult();
    setRound(0);
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
    const nextItems = sanitizeItems(nextTemplates[nextName] || []);
    setData((current) => ({ ...current, [templateKey]: nextTemplates }));
    setActiveTemplate(nextName);
    setItems(nextItems);
    setSavedSnapshot(JSON.stringify(nextItems));
    resetResult();
    setRound(0);
  };
  const confirm = () => {
    if (!pendingResult || busy.current) return;
    addHistory(pendingResult.type, pendingResult.result);
    setPendingResult(null);
  };

  return (
    <div className="workspace-grid">
      <Panel className="draw-panel">
        <div className="draw-heading">
          <div>
            <span className="eyebrow">
              {isFood ? "THE TASTE OF CHANCE" : "A LITTLE LUCK, A GREAT DINNER"}
            </span>
            <h2>
              {isFood ? (
                <>
                  今天，吃点<span>什么？</span>
                </>
              ) : (
                <>
                  这顿，谁来<span>请客？</span>
                </>
              )}
            </h2>
            <p className="muted">
              {isFood
                ? "把纠结交给转盘，把好胃口留给自己。"
                : "名单准备好，今晚的幸运嘉宾即将揭晓。"}
            </p>
          </div>
          <span className="round-badge">
            ROUND <b>{String(round + 1).padStart(2, "0")}</b>
          </span>
        </div>
        <div className="draw-meta">
          <span>
            <i className="status-dot" />
            {activeTemplate || "自由选择"}
          </span>
          <span>
            {cleanItems.length} 个候选 · {weightTotal} 票
          </span>
        </div>
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
          <div className={`slot-machine ${spinning ? "is-spinning" : ""}`}>
            <div className="slot-topline">
              <span>TONIGHT'S LUCKY ONE</span>
              <i className="status-dot" />
            </div>
            <div className="slot-reels">
              {slotItems.map((item, i) => (
                <div className="slot-reel" key={i}>
                  <span
                    key={item}
                    className={spinning ? "slot-name is-moving" : "slot-name"}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <p>{spinning ? "好运正在排队入场" : "三格同名，今晚就是你"}</p>
          </div>
        )}
        <div
          className={`result-card ${selected && !spinning ? "has-result" : ""}`}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <Confetti active={justStopped && !reducedMotion} />
          <div>
            <span className="eyebrow">
              {spinning
                ? "FINDING YOUR ANSWER"
                : selected
                  ? "YOUR ANSWER"
                  : "A LITTLE RANDOM MAGIC"}
            </span>
            <strong>
              {spinning
                ? "答案正在路上…"
                : selected || "下一个好决定，从这里开始"}
            </strong>
          </div>
          <span className="result-status">
            {spinning
              ? "抽选中"
              : selected
                ? pendingResult
                  ? "待确认"
                  : "已记下"
                : "准备就绪"}
          </span>
        </div>
        <div className="draw-actions">
          <Button
            onClick={isFood ? spin : slotSpin}
            disabled={!weightTotal || spinning}
            className="start-button"
          >
            {spinning
              ? "正在选择…"
              : round
                ? "再来一次"
                : isFood
                  ? "转出今天的答案"
                  : "抽出今晚的嘉宾"}
            <Icon name="arrow" />
          </Button>
          <Button
            variant="soft"
            onClick={confirm}
            disabled={!pendingResult || spinning}
          >
            <Icon name="check" />
            就决定它了
          </Button>
        </div>
        <p className="draw-note">
          {round >= 4
            ? "如果一直想重抽，也许你心里已经有了答案。"
            : "每次独立抽选，按支持人数分配概率。确认后记入历史。"}
        </p>
      </Panel>
      <aside className="settings-column">
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

function HistoryPanel({ history, activeFilter, onFilterChange, onClear }) {
  const visible =
    activeFilter === "全部"
      ? history
      : history.filter((item) => item.type === activeFilter);
  return (
    <Panel className="history-panel">
      <div className="history-heading">
        <div className="history-title">
          <Icon name="history" />
          <h3>决定的足迹</h3>
          <span className="count-badge">{history.length}</span>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={!history.length}
          onClick={() => {
            if (window.confirm("清空所有历史记录？")) onClear();
          }}
        >
          <Icon name="trash" size={14} />
          清空记录
        </button>
      </div>
      <div className="history-filters">
        {["全部", ...tabs.map((tab) => tab.label)].map((filter) => (
          <button
            type="button"
            aria-pressed={activeFilter === filter}
            className={activeFilter === filter ? "is-active" : ""}
            key={filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="history-list">
        {visible.length ? (
          visible.map((item, index) => (
            <div className="history-item" key={`${item.time}-${index}`}>
              <span className="history-type">{item.type}</span>
              <strong>{item.result}</strong>
              <time dateTime={item.time}>{formatTime(item.time)}</time>
            </div>
          ))
        ) : (
          <div className="history-empty">
            <span className="muted">好决定值得记下来。</span>
            <span>确认转盘结果，或抛一次硬币、掷一次骰子。</span>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function App() {
  const [active, setActive] = useState("food");
  const [data, setData] = useState(loadData);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("全部");
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const saved = saveData(data);
    // Saving is synchronous; only the status notification is deferred.
    queueMicrotask(() => setStorageAvailable(saved));
  }, [data]);
  useEffect(() => {
    const beforeUnload = (event) => {
      const unsaved = document.querySelector(".is-dirty");
      if (unsaved) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);
  const addHistory = (type, result) =>
    setData((current) => ({
      ...current,
      history: [
        { type, result, time: new Date().toISOString() },
        ...current.history,
      ].slice(0, MAX_HISTORY),
    }));
  return (
    <div className="app-shell">
      <div className="ambient-light" aria-hidden="true" />
      <div className="app-container">
        <header className="app-header">
          <a
            className="brand"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setActive("food");
            }}
            aria-label="回到吃什么"
          >
            <span className="brand-mark">
              <Icon name="wheel" size={25} />
            </span>
            <div>
              <strong>
                随它<span>·</span>
              </strong>
              <small>DECISION CLUB</small>
            </div>
          </a>
          <nav className="desktop-nav" aria-label="抽选方式">
            {tabs.map((tab) => (
              <button
                type="button"
                key={tab.id}
                aria-pressed={active === tab.id}
                className={active === tab.id ? "is-active" : ""}
                onClick={() => setActive(tab.id)}
              >
                <Icon name={tab.icon} size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
          <span className="header-note">
            <i className="status-dot" />
            一点随机，刚刚好
          </span>
        </header>
        <nav className="mobile-nav" aria-label="手机抽选方式">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              aria-pressed={active === tab.id}
              className={active === tab.id ? "is-active" : ""}
              onClick={() => setActive(tab.id)}
            >
              <Icon name={tab.icon} size={22} />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <main>
          {/* Keep each mode mounted so switching tabs preserves drafts and finishes active draws. */}
          <div hidden={active !== "food"}>
            <WheelPage
              mode="food"
              data={data}
              setData={setData}
              addHistory={addHistory}
              reducedMotion={reducedMotion}
            />
          </div>
          <div hidden={active !== "payer"}>
            <WheelPage
              mode="payer"
              data={data}
              setData={setData}
              addHistory={addHistory}
              reducedMotion={reducedMotion}
            />
          </div>
          <div hidden={active !== "coin"}>
            <CoinPage addHistory={addHistory} reducedMotion={reducedMotion} />
          </div>
          <div hidden={active !== "dice"}>
            <DicePage addHistory={addHistory} reducedMotion={reducedMotion} />
          </div>
          <HistoryPanel
            history={data.history}
            activeFilter={historyFilter}
            onFilterChange={setHistoryFilter}
            onClear={() => setData((current) => ({ ...current, history: [] }))}
          />
        </main>
        <footer className="app-footer">
          <span>随它 · MAKE ROOM FOR CHANCE</span>
          <span role={storageAvailable ? undefined : "alert"}>
            {storageAvailable
              ? "模板和历史保存在此浏览器 · 修改名单后记得保存"
              : "此浏览器无法保存数据，刷新后会丢失"}
          </span>
        </footer>
      </div>
    </div>
  );
}
