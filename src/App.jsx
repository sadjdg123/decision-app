import React, { useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEY, SPIN_DURATION, SLOT_INTERVAL, DICE_INTERVAL, MAX_HISTORY, MAX_WEIGHT, defaultData, tabs } from "./constants";
import {
  isPlainObject,
  clampWeight,
  sanitizeItem,
  sanitizeItems,
  sanitizeTemplateMap,
  normalizeHistory,
  normalizeData,
  loadData,
  saveData,
  totalWeight,
  weightedNames,
  pickWeightedIndex,
  pickWeightedName,
  rollDiceValue,
  mod360,
  getWheelLabelPosition,
  getFinalRotationForTarget,
  triggerVibration,
  formatTime,
  runSelfTests,
} from "./utils";
import DicePage from "./components/DicePage";
import CoinPage from "./components/CoinPage";
import Wheel from "./components/Wheel";
import OptionEditor from "./components/OptionEditor";
import TemplatePicker from "./components/TemplatePicker";

function Button({ children, className = "", variant = "primary", disabled = false, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    purple: "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20",
    danger: "bg-transparent text-red-500 hover:bg-red-50 hover:text-red-600",
    soft: "bg-slate-100 text-slate-700 hover:bg-slate-200"
  };

  return (
    <button type="button" disabled={disabled} className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Icon({ children, className = "" }) {
  return <span className={`inline-flex h-5 w-5 items-center justify-center leading-none ${className}`}>{children}</span>;
}

function AntiDecisionHint({ count, result }) {
  if (count < 4) return null;

  const message = count >= 8 ? "你已经转很多次了，其实你心里可能已经有答案了 😏" : "再纠结一下也行，但这个结果已经可以考虑接受了。";

  return (
    <div className="rounded-2xl bg-amber-50 p-4 text-sm font-bold text-amber-700">
      {message}{result ? ` 当前结果：${result}` : ""}
    </div>
  );
}

function WheelPage({ mode, data, setData, addHistory }) {
  const isFood = mode === "food";
  const templateKey = isFood ? "foodTemplates" : "peopleTemplates";
  const templates = data[templateKey] || {};
  const templateNames = Object.keys(templates);
  const firstTemplate = templateNames[0] || "";
  const initialItems = sanitizeItems(firstTemplate ? templates[firstTemplate] : []);
  const [activeTemplate, setActiveTemplate] = useState(firstTemplate);
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [justStopped, setJustStopped] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [slotItems, setSlotItems] = useState(["?", "?", "?"]);
  const [tryCount, setTryCount] = useState(0);
  const [pendingResult, setPendingResult] = useState(null);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(initialItems));
  const spinTimeoutRef = useRef(null);
  const slotIntervalRefs = useRef([]);
  const slotStopTimeoutRefs = useRef([]);
  const slotTimeoutRef = useRef(null);
  const cleanItems = useMemo(() => sanitizeItems(items), [items]);
  const cleanItemsKey = useMemo(() => JSON.stringify(cleanItems), [cleanItems]);
  const cleanItemsTotal = useMemo(() => totalWeight(cleanItems), [cleanItemsKey]);
  const isDirty = cleanItemsKey !== savedSnapshot;

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
      slotIntervalRefs.current.forEach((id) => id && window.clearInterval(id));
      slotStopTimeoutRefs.current.forEach((id) => id && window.clearTimeout(id));
      if (slotTimeoutRef.current) window.clearTimeout(slotTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const names = Object.keys(templates);
    if (activeTemplate && templates[activeTemplate]) return;

    const nextName = names[0] || "";
    const nextItems = sanitizeItems(nextName ? templates[nextName] : []);
    setActiveTemplate(nextName);
    setItems(nextItems);
    setSavedSnapshot(JSON.stringify(nextItems));
    setSelected("");
    setPendingResult(null);
    setTryCount(0);
    setSlotItems(["?", "?", "?"]);
  }, [templates, activeTemplate]);

  const finishResult = (result, type) => {
    setSelected(result);
    setPendingResult({ type, result });
    setTryCount((count) => count + 1);
    setJustStopped(true);
    triggerVibration([30, 40, 30]);
    // Auto-clear the glow after 1.5s
    setTimeout(() => setJustStopped(false), 1500);
  };

  const confirmResult = () => {
    if (!pendingResult) return;
    addHistory(pendingResult.type, pendingResult.result);
    setPendingResult(null);
  };

  const spin = () => {
    if (!cleanItems.length || spinning || !cleanItemsTotal) return;

    const targetIndex = pickWeightedIndex(cleanItems, cleanItemsTotal);
    if (targetIndex < 0) return;

    const targetStart = cleanItems.slice(0, targetIndex).reduce((sum, item) => sum + (item.weight / cleanItemsTotal) * 360, 0);
    const targetCenter = targetStart + (cleanItems[targetIndex].weight / cleanItemsTotal) * 180;
    const finalRotation = getFinalRotationForTarget(rotation, targetCenter);

    setSelected("");
    setPendingResult(null);
    setSpinning(true);
    setRotation(finalRotation);
    triggerVibration(25);

    if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = window.setTimeout(() => {
      finishResult(cleanItems[targetIndex].name, isFood ? "吃什么" : "谁请客");
      setSpinning(false);
      spinTimeoutRef.current = null;
    }, SPIN_DURATION);
  };

  const slotSpin = () => {
    if (!cleanItems.length || spinning || !cleanItemsTotal) return;

    setSelected("");
    setPendingResult(null);
    setSpinning(true);
    triggerVibration(25);

    slotIntervalRefs.current.forEach((id) => id && window.clearInterval(id));
    slotStopTimeoutRefs.current.forEach((id) => id && window.clearTimeout(id));

    slotIntervalRefs.current = [0, 1, 2].map((column) =>
      window.setInterval(() => {
        setSlotItems((current) => {
          const next = [...current];
          next[column] = pickWeightedName(cleanItems, cleanItemsTotal);
          return next;
        });
      }, SLOT_INTERVAL + column * 45)
    );

    slotStopTimeoutRefs.current = [900, 1250, 1650].map((delay, column) =>
      window.setTimeout(() => {
        const intervalId = slotIntervalRefs.current[column];
        if (intervalId) {
          window.clearInterval(intervalId);
          slotIntervalRefs.current[column] = null;
        }
      }, delay)
    );

    if (slotTimeoutRef.current) window.clearTimeout(slotTimeoutRef.current);
    slotTimeoutRef.current = window.setTimeout(() => {
      slotIntervalRefs.current.forEach((id) => id && window.clearInterval(id));
      slotIntervalRefs.current = [];
      slotStopTimeoutRefs.current = [];
      const result = pickWeightedName(cleanItems, cleanItemsTotal);
      setSlotItems([result, result, result]);
      finishResult(result, "谁请客");
      setSpinning(false);
      slotTimeoutRef.current = null;
    }, 1800);
  };

  const chooseTemplate = (name) => {
    const nextItems = sanitizeItems(templates[name] || []);
    setActiveTemplate(name);
    setItems(nextItems);
    setSavedSnapshot(JSON.stringify(nextItems));
    setSelected("");
    setPendingResult(null);
    setTryCount(0);
    setSlotItems(["?", "?", "?"]);
  };

  const handleNew = (name) => {
    const nextTemplates = { ...templates, [name]: [] };
    setData((currentData) => ({ ...currentData, [templateKey]: nextTemplates }));
    setActiveTemplate(name);
    setItems([]);
    setSavedSnapshot(JSON.stringify([]));
  };

  const handleSave = (name) => {
    const nextTemplates = { ...templates, [name]: [...cleanItems] };
    setData((currentData) => ({ ...currentData, [templateKey]: nextTemplates }));
    setActiveTemplate(name);
    setSavedSnapshot(JSON.stringify(cleanItems));
  };

  const deleteTemplate = (name) => {
    const nextTemplates = { ...templates };
    delete nextTemplates[name];
    const nextName = Object.keys(nextTemplates)[0] || "";
    const nextItems = sanitizeItems(nextName ? nextTemplates[nextName] : []);

    setData((currentData) => ({ ...currentData, [templateKey]: nextTemplates }));
    setActiveTemplate(nextName);
    setItems(nextItems);
    setSavedSnapshot(JSON.stringify(nextItems));
    setSelected("");
    setPendingResult(null);
    setTryCount(0);
    setSlotItems(["?", "?", "?"]);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_370px]">
      <div className="space-y-5">
        <Card className="overflow-hidden rounded-3xl bg-gradient-to-br from-white via-violet-50 to-slate-100">
          <CardContent className="space-y-6 p-5 sm:p-8">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">{isFood ? "FOOD SPINNER" : "PAYER SLOT"}</div>
              <h2 className="text-2xl font-black text-slate-900">{isFood ? "今天吃什么？" : "这顿谁请客？"}</h2>
              <p className="mt-1 text-sm text-slate-500">支持人数越多，扇区越大，被抽中的概率越高。</p>
            </div>
            {isFood ? (
              <Wheel items={cleanItems} spinning={spinning} selected={selected} rotation={rotation} onSpin={spin} justStopped={justStopped} />
            ) : (
              <div className="mx-auto max-w-md rounded-3xl bg-slate-950 p-5 shadow-2xl">
                <div className="mb-4 text-center text-sm font-bold text-white/70">老虎机模式</div>
                <div className="grid grid-cols-3 gap-3">
                  {slotItems.map((item, index) => (
                    <div key={`${item}-${index}`} className={`flex h-28 items-center justify-center rounded-2xl bg-white text-center text-xl font-black text-slate-900 shadow-inner transition-transform ${spinning ? "scale-105" : "scale-100"}`}>
                      <span className="max-w-[80px] truncate">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-white/10 p-3 text-center text-white">
                  结果：<b>{spinning ? "..." : selected || "?"}</b>
                </div>
              </div>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={isFood ? spin : slotSpin} disabled={!cleanItems.length || spinning} variant="purple" className="h-12 w-full rounded-2xl text-base">
                <Icon>{spinning ? "🔄" : "🎯"}</Icon>
                {spinning ? "选择中..." : isFood ? "开始转盘" : "开始抽人"}
              </Button>
              <Button onClick={confirmResult} disabled={!pendingResult || spinning} variant="soft" className="h-12 w-full rounded-2xl text-base">
                <Icon>✅</Icon>就决定它了
              </Button>
            </div>
            <AntiDecisionHint count={tryCount} result={selected} />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-5">
        <TemplatePicker title={isFood ? "店铺模板" : "人名模板"} templates={templates} activeName={activeTemplate} isDirty={isDirty} onChoose={chooseTemplate} onNew={handleNew} onSave={handleSave} onDelete={deleteTemplate} />
        <OptionEditor items={items} setItems={setItems} placeholder={isFood ? "添加店名，比如 海底捞" : "添加人名，比如 小明"} foodTemplates={data.foodTemplates} peopleTemplates={data.peopleTemplates} />
      </div>
    </div>
  );
}

function HistoryPanel({ history, activeFilter, onFilterChange, onClear }) {
  const filters = ["全部", "吃什么", "谁请客", "抛硬币", "掷骰子"];
  const visibleHistory = activeFilter === "全部" ? history : history.filter((item) => item.type === activeFilter);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">历史记录</h3>
          <Button variant="soft" className="px-3 py-1 text-xs" onClick={onClear}>清空</Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${activeFilter === filter ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="max-h-60 space-y-2 overflow-auto pr-1">
          {visibleHistory.length ? (
            visibleHistory.map((item, index) => (
              <div key={`${item.time}-${index}`} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <div className="font-bold text-slate-800">{item.result}</div>
                  <div className="text-xs text-slate-400">{item.type}</div>
                </div>
                <div className="text-xs text-slate-400">{formatTime(item.time)}</div>
              </div>
            ))
          ) : (
            <div className="rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">还没有记录</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [active, setActive] = useState("food");
  const [data, setData] = useState(loadData);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("全部");

  useEffect(() => {
    runSelfTests();
  }, []);

  useEffect(() => {
    setStorageAvailable(saveData(data));
  }, [data]);

  const addHistory = (type, result) => {
    setData((currentData) => ({
      ...currentData,
      history: [{ type, result, time: new Date().toISOString() }, ...(currentData.history || [])].slice(0, MAX_HISTORY)
    }));
  };

  const clearHistory = () => {
    setData((currentData) => ({ ...currentData, history: [] }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">Decision Party Pro</div>
            <h1 className="text-2xl font-black sm:text-3xl">聚餐选择困难症终结器</h1>
            <p className="mt-1 text-sm text-white/60">加权投票、历史记录、反纠结提醒、震动反馈，一页搞定。</p>
          </div>
          <div className="hidden grid-cols-4 gap-2 rounded-2xl bg-white/10 p-2 sm:grid">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActive(tab.id)}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold transition ${active === tab.id ? "bg-white text-slate-950" : "text-white/70 hover:bg-white/10"}`}
              >
                <span className="text-lg leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <div className="space-y-5">
          {active === "food" && <WheelPage mode="food" data={data} setData={setData} addHistory={addHistory} />}
          {active === "payer" && <WheelPage mode="payer" data={data} setData={setData} addHistory={addHistory} />}
          {active === "coin" && <CoinPage addHistory={addHistory} />}
          {active === "dice" && <DicePage addHistory={addHistory} />}
          <HistoryPanel history={data.history || []} activeFilter={historyFilter} onFilterChange={setHistoryFilter} onClear={clearHistory} />
        </div>

        <footer className="rounded-2xl bg-white p-4 pb-20 text-center text-xs text-slate-500 shadow-sm sm:pb-4">
          {storageAvailable ? "数据会保存在当前浏览器本地。换手机或清缓存后需要重新添加模板。" : "当前浏览器无法保存本地数据，刷新后模板可能会丢失。"}
        </footer>

        <nav className="fixed bottom-4 left-1/2 z-50 grid w-[calc(100%-32px)] max-w-md -translate-x-1/2 grid-cols-4 gap-2 rounded-3xl bg-slate-950/95 p-2 text-white shadow-2xl backdrop-blur sm:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${active === tab.id ? "bg-white text-slate-950" : "text-white/70"}`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
