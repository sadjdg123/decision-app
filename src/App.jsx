import { useEffect, useState } from "react";
import { MAX_HISTORY, SOUND_KEY, tabs } from "./constants";
import { loadData, saveData, formatTime } from "./utils";
import { setSoundEnabled } from "./sound";
import { Icon, Panel } from "./components/UI";
import DicePage from "./components/DicePage";
import CoinPage from "./components/CoinPage";
import DrawPage from "./components/DrawPage";

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

function useSoundSetting() {
  const [on, setOn] = useState(() => {
    try {
      return window.localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    setSoundEnabled(on);
    try {
      window.localStorage.setItem(SOUND_KEY, on ? "on" : "off");
    } catch {
      /* The setting simply will not be remembered. */
    }
  }, [on]);
  return [on, setOn];
}

const TYPE_TONE = {
  吃什么: "coral",
  谁请客: "violet",
  抛硬币: "gold",
  掷骰子: "teal",
};

function HistoryPanel({ history, activeFilter, onFilterChange, onClear }) {
  const visible =
    activeFilter === "全部"
      ? history
      : history.filter((item) => item.type === activeFilter);
  return (
    <Panel className="history-panel">
      <div className="panel-head">
        <h3>
          <Icon name="history" size={18} />
          决定的足迹
          <span className="count">{history.length}</span>
        </h3>
        <button
          type="button"
          className="text-button"
          disabled={!history.length}
          onClick={() => {
            if (window.confirm("清空所有历史记录？")) onClear();
          }}
        >
          <Icon name="trash" size={14} />
          清空
        </button>
      </div>
      <div className="filters" role="group" aria-label="筛选记录">
        {["全部", ...tabs.map((tab) => tab.label)].map((filter) => (
          <button
            type="button"
            aria-pressed={activeFilter === filter}
            key={filter}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      {visible.length ? (
        <ol className="history-list">
          {visible.map((item, index) => (
            <li key={`${item.time}-${index}`}>
              <span className={`tag tag--${TYPE_TONE[item.type] || "violet"}`}>
                {item.type}
              </span>
              <strong>{item.result}</strong>
              <time dateTime={item.time}>{formatTime(item.time)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">
          还没有记录。确认一次转盘结果，或者抛个硬币、掷个骰子。
        </p>
      )}
    </Panel>
  );
}

export default function App() {
  const [active, setActive] = useState("food");
  const [data, setData] = useState(loadData);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [historyFilter, setHistoryFilter] = useState("全部");
  const [soundOn, setSoundOn] = useSoundSetting();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const saved = saveData(data);
    // Saving is synchronous; only the status notification is deferred.
    queueMicrotask(() => setStorageAvailable(saved));
  }, [data]);
  useEffect(() => {
    const beforeUnload = (event) => {
      if (document.querySelector(".is-dirty")) {
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
  const nav = (className, label, size) => (
    <nav className={className} aria-label={label}>
      {tabs.map((tab) => (
        <button
          type="button"
          key={tab.id}
          aria-pressed={active === tab.id}
          onClick={() => setActive(tab.id)}
        >
          <Icon name={tab.icon} size={size} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
  return (
    <div className="app">
      <header className="topbar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setActive("food");
          }}
          aria-label="随它 · 回到吃什么"
        >
          <img src="/favicon.svg" alt="" width="36" height="36" />
          <span>
            随它
            <small>Decision Club</small>
          </span>
        </a>
        {nav("tabs tabs--top", "抽选方式", 18)}
        <button
          type="button"
          className="sound-toggle"
          aria-pressed={soundOn}
          aria-label={soundOn ? "关闭音效" : "打开音效"}
          onClick={() => setSoundOn((on) => !on)}
        >
          <Icon name={soundOn ? "sound" : "mute"} size={18} />
        </button>
      </header>
      <main>
        {/* Keep each mode mounted so switching tabs preserves drafts and finishes active draws. */}
        <div hidden={active !== "food"}>
          <DrawPage
            mode="food"
            data={data}
            setData={setData}
            addHistory={addHistory}
            reducedMotion={reducedMotion}
          />
        </div>
        <div hidden={active !== "payer"}>
          <DrawPage
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
      <footer className="footer">
        <span role={storageAvailable ? undefined : "alert"}>
          {storageAvailable
            ? "模板和记录只存在这台设备的浏览器里"
            : "此浏览器无法保存数据，刷新后会丢失"}
        </span>
      </footer>
      {nav("tabs tabs--bottom", "抽选方式（底部）", 22)}
    </div>
  );
}
