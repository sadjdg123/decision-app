import { useState } from "react";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Icon({ children, className = "" }) {
  return <span className={`inline-flex h-5 w-5 items-center justify-center leading-none ${className}`}>{children}</span>;
}

function Button({ children, className = "", variant = "primary", disabled = false, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";
  const styles = {
    primary: "bg-slate-950 text-white hover:bg-slate-800",
    purple: "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-600/20",
    danger: "bg-transparent text-red-500 hover:bg-red-50 hover:text-red-600",
    soft: "bg-slate-100 text-slate-700 hover:bg-slate-200",
  };

  return (
    <button type="button" disabled={disabled} className={`${base} ${styles[variant] || styles.primary} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Derives unique option name suggestions from all templates across both food and people templates
function deriveAllOptionNames(foodTemplates, peopleTemplates) {
  const seen = new Set();
  const result = [];

  const collect = (templates) => {
    Object.values(templates || {}).forEach((items) => {
      (items || []).forEach((item) => {
        const name = item?.name?.trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          result.push(name);
        }
      });
    });
  };

  collect(foodTemplates);
  collect(peopleTemplates);
  return result;
}

export default function OptionEditor({ items, setItems, placeholder, foodTemplates, peopleTemplates }) {
  const [text, setText] = useState("");
  const allNames = deriveAllOptionNames(foodTemplates, peopleTemplates);
  const listId = "option-name-list";

  const addItem = () => {
    const value = text.trim();
    if (!value) return;
    setItems((prev) => [...prev, { name: value, weight: 1 }]);
    setText("");
  };

  const updateItem = (index, patch) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div>
          <h3 className="font-bold text-slate-900">选项和支持人数</h3>
          <p className="mt-1 text-xs text-slate-500">支持人数越多，扇区越大，被抽中的概率越高。</p>
        </div>

        {/* Add new option row */}
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
              list={listId}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-8 outline-none focus:border-violet-400"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ×
              </button>
            )}
            <datalist id={listId}>
              {allNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
          <Button onClick={addItem} variant="purple" className="shrink-0 px-3">
            <Icon>＋</Icon>
          </Button>
        </div>

        {/* Options list */}
        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item, index) => (
              <div key={`${item.name}-${index}`} className="grid grid-cols-[1fr_80px_32px] items-center gap-2 rounded-2xl bg-slate-50 p-2">
                <input
                  value={item.name}
                  onChange={(e) => updateItem(index, { name: e.target.value })}
                  list={`${listId}-${index}`}
                  className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
                />
                <datalist id={`${listId}-${index}`}>
                  {allNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <select
                  value={item.weight}
                  onChange={(e) => updateItem(index, { weight: Number(e.target.value) })}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center text-sm outline-none focus:border-violet-400"
                  aria-label={`${item.name} 的支持人数`}
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}人
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={`删除 ${item.name}`}
                  onClick={() => removeItem(index)}
                  className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                >
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
