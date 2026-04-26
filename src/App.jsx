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

function Wheel({ items, spinning, selected, rotation, onSpin }) {
  const cleanItems = useMemo(() => sanitizeItems(items), [items]);
  const safeItems = cleanItems.length ? cleanItems : [{ name: "请添加选项", weight: 1 }];
  const itemsKey = safeItems.map((item) => `${item.name}:${item.weight}`).join("|");
  const weightTotal = useMemo(() => totalWeight(safeItems) || 1, [itemsKey]);
  const segments = useMemo(() => {
    let cursor = 0;
    return safeItems.map((item, index) => {
      const size = (item.weight / weightTotal) * 360;
      const segment = {
        ...item,
        start: cursor,
        end: cursor + size,
        size,
        color: `hsl(${(index * 47 + 255) % 360} 82% 62%)`
      };
      cursor += size;
      return segment;
    });
  }, [itemsKey, weightTotal]);
  const background = useMemo(() => segments.map((segment) => `${segment.color} ${segment.start}deg ${segment.end}deg`).join(", "), [segments]);
  const labelRadius = safeItems.length >= 8 ? 108 : 102;
  const verticalText = safeItems.length >= 8;

  return (
    <div className="relative mx-auto flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80">
      <div className="absolute -top-1 z-30 h-0 w-0 border-l-[14px] border-r-[14px] border-t-[30px] border-l-transparent border-r-transparent border-t-violet-600 drop-shadow-lg" />
      <div
        className="relative h-full w-full rounded-full border-[14px] border-white shadow-2xl transition-transform duration-[3600ms] ease-out"
        style={{ background: `conic-gradient(${background})`, transform: `rotate(${rotation}deg)` }}
      >
        <div className="absolute inset-0 rounded-full ring-1 ring-black/5" />
        <div className="absolute inset-3 rounded-full border-2 border-white/50" />
        {segments.map((segment, index) => {
          const position = getWheelLabelPosition(segment.start, segment.size, labelRadius);

          return (
            <div
              key={`${segment.name}-${index}`}
              className="absolute left-1/2 top-1/2 flex h-16 w-24 items-center justify-center text-center text-xs font-black text-white drop-shadow-md sm:text-sm"
              style={{ transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${position.readableAngle}deg)` }}
            >
              <span className="max-w-[88px] leading-tight" style={{ writingMode: verticalText ? "vertical-rl" : "horizontal-tb" }}>
                {segment.name}
              </span>
            </div>
          );
        })}
        <div className="absolute left-1/2 top-1/2 h-[112px] w-[112px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[12px] border-white bg-white" />
      </div>
      <button
        type="button"
        onClick={onSpin}
        disabled={!cleanItems.length || spinning}
        className="absolute z-20 flex h-24 w-24 flex-col items-center justify-center rounded-full bg-violet-600 text-center text-white shadow-xl transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-80"
      >
        <span className="text-xs text-white/75">结果</span>
        <span className="max-w-[72px] truncate text-lg font-black">{spinning ? "..." : selected || "开始"}</span>
      </button>
    </div>
  );
}

function TemplatePicker({ title, templates, activeName, isDirty, onChoose, onSave, onDelete }) {
  const [newName, setNewName] = useState("");
  const templateNames = Object.keys(templates);

  const submit = () => {
    const name = newName.trim();
    if (!name) return;
    onSave(name);
    setNewName("");
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <span className={`shrink-0 text-xs font-bold ${isDirty ? "text-amber-600" : "text-slate-500"}`}>{isDirty ? "当前模板未保存" : "已保存"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {templateNames.length > 0 ? (
            templateNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => onChoose(name)}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${activeName === name ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                {name}
              </button>
            ))
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-500">暂无模板</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
            placeholder="新模板名，例如：周末聚餐"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
          <Button onClick={submit} variant="purple" className="shrink-0">
            <Icon>💾</Icon>保存
          </Button>
        </div>
        {activeName && (
          <Button variant="danger" onClick={() => onDelete(activeName)} className="w-full">
            <Icon>🗑️</Icon>删除当前模板
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function OptionEditor({ items, setItems, placeholder }) {
  const [text, setText] = useState("");

  const addItem = () => {
    const value = text.trim();
    if (!value) return;
    setItems(sanitizeItems([...items, { name: value, weight: 1 }]));
    setText("");
  };

  const updateItem = (index, patch) => {
    setItems((currentItems) => currentItems.map((item, itemIndex) => (itemIndex === index ? sanitizeItem({ ...item, ...patch }) || item : item)));
  };

  const removeItem = (index) => {
    setItems((currentItems) => currentItems.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="font-bold text-slate-900">选项和支持人数</h3>
          <p className="mt-1 text-xs text-slate-500">支持人数越多，扇区越大，被抽中的概率越高。</p>
        </div>
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder={placeholder}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-violet-400"
          />
          <Button onClick={addItem} variant="purple" className="shrink-0 px-3">
            <Icon>＋</Icon>
          </Button>
        </div>
        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_76px_32px] items-center gap-2 rounded-2xl bg-slate-50 p-2">
                <input
                  value={item.name}
                  onChange={(event) => updateItem(index, { name: event.target.value })}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <input
                  type="number"
                  min="1"
                  max={MAX_WEIGHT}
                  value={item.weight}
                  onChange={(event) => updateItem(index, { weight: event.target.value })}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm outline-none focus:border-violet-400"
                  aria-label={`${item.name} 的支持人数`}
                />
                <button type="button" aria-label={`删除 ${item.name}`} onClick={() => removeItem(index)} className="rounded-xl p-2 text-red-500 hover:bg-red-50">
                  ×
                </button>
              </div>
            ))
          ) : (
            <span className="text-sm text-slate-400">还没有选项，先添加一个。</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
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
    triggerVibration([30, 40, 30]);
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

  const saveTemplate = (name) => {
    if (!cleanItems.length) return;

    const nextTemplates = { ...templates, [name]: cleanItems };
    setItems(cleanItems);
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
              <Wheel items={cleanItems} spinning={spinning} selected={selected} rotation={rotation} onSpin={spin} />
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
        <TemplatePicker title={isFood ? "店铺模板" : "人名模板"} templates={templates} activeName={activeTemplate} isDirty={isDirty} onChoose={chooseTemplate} onSave={saveTemplate} onDelete={deleteTemplate} />
        <OptionEditor items={items} setItems={setItems} placeholder={isFood ? "添加店名，比如 海底捞" : "添加人名，比如 小明"} />
      </div>
    </div>
  );
}

function CoinPage({ addHistory }) {
  const [result, setResult] = useState("?");
  const [flipping, setFlipping] = useState(false);
  const [flipCount, setFlipCount] = useState(0);
  const flipTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
    };
  }, []);

  const flip = () => {
    if (flipping) return;

    setFlipping(true);
    setFlipCount((count) => count + 1);
    triggerVibration(25);

    if (flipTimeoutRef.current) window.clearTimeout(flipTimeoutRef.current);
    flipTimeoutRef.current = window.setTimeout(() => {
      const next = Math.random() > 0.5 ? "正面" : "反面";
      setResult(next);
      addHistory("抛硬币", next);
      triggerVibration([30, 40, 30]);
      setFlipping(false);
      flipTimeoutRef.current = null;
    }, 1200);
  };

  const isFront = result !== "反面";
  const coinSymbol = result === "?" ? "?" : isFront ? "正" : "反";

  return (
    <Card className="overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-white to-violet-50">
      <CardContent className="relative flex min-h-[560px] flex-col items-center justify-center gap-8 p-8 text-center">
        <div className="absolute left-10 top-10 h-24 w-24 rounded-full bg-amber-200/30 blur-2xl" />
        <div className="absolute bottom-12 right-12 h-32 w-32 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="relative">
          <div className="mx-auto mb-3 inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-black text-amber-700 shadow-sm">LUCKY COIN</div>
          <h2 className="text-3xl font-black text-slate-900">抛硬币</h2>
          <p className="mt-2 text-sm text-slate-500">纠结二选一时，让金币替你拍板。</p>
        </div>
        <div className="relative flex h-72 w-72 items-center justify-center" style={{ perspective: "1000px" }}>
          <div className="absolute h-64 w-64 translate-y-8 rounded-full bg-amber-900/20 blur-xl" />
          <div
            className="relative h-60 w-60 rounded-full transition-transform duration-[1200ms] ease-out"
            style={{ transformStyle: "preserve-3d", transform: `rotateY(${flipCount * 1800 + (isFront ? 0 : 180)}deg) rotateZ(${flipping ? 16 : 0}deg)` }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-yellow-700 p-3 shadow-[0_30px_70px_rgba(146,64,14,0.35)]" style={{ backfaceVisibility: "hidden" }}>
              <div className="flex h-full w-full items-center justify-center rounded-full border-[10px] border-yellow-100/80 bg-gradient-to-br from-amber-200 via-yellow-400 to-amber-600 shadow-inner">
                <div className="flex h-[72%] w-[72%] flex-col items-center justify-center rounded-full border-4 border-amber-100/80 bg-gradient-to-br from-yellow-100/70 to-amber-500/40 shadow-inner">
                  <span className="text-7xl font-black text-amber-900 drop-shadow-sm">正</span>
                  <span className="mt-1 text-xs font-black tracking-[0.35em] text-amber-800/70">YES</span>
                </div>
              </div>
              <div className="absolute inset-5 rounded-full border border-white/40" />
              <div className="absolute left-10 top-8 h-16 w-8 rotate-45 rounded-full bg-white/35 blur-sm" />
            </div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-200 via-amber-500 to-yellow-800 p-3 shadow-[0_30px_70px_rgba(146,64,14,0.35)]" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
              <div className="flex h-full w-full items-center justify-center rounded-full border-[10px] border-yellow-100/80 bg-gradient-to-br from-orange-200 via-amber-500 to-yellow-700 shadow-inner">
                <div className="flex h-[72%] w-[72%] flex-col items-center justify-center rounded-full border-4 border-amber-100/80 bg-gradient-to-br from-yellow-100/70 to-orange-600/40 shadow-inner">
                  <span className="text-7xl font-black text-amber-950 drop-shadow-sm">反</span>
                  <span className="mt-1 text-xs font-black tracking-[0.35em] text-amber-900/70">NO</span>
                </div>
              </div>
              <div className="absolute inset-5 rounded-full border border-white/40" />
              <div className="absolute left-10 top-8 h-16 w-8 rotate-45 rounded-full bg-white/30 blur-sm" />
            </div>
          </div>
          <div className="absolute -bottom-2 rounded-full bg-white px-5 py-2 text-sm font-black text-slate-700 shadow-lg">
            当前结果：<span className="text-violet-600">{coinSymbol}</span>
          </div>
        </div>
        <Button onClick={flip} disabled={flipping} variant="purple" className="h-12 w-full max-w-sm rounded-2xl text-base">
          <Icon>🪙</Icon>{flipping ? "金币翻转中..." : "抛一次"}
        </Button>
      </CardContent>
    </Card>
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
