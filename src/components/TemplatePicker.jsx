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

export default function TemplatePicker({ title, templates, activeName, isDirty, onChoose, onNew, onSave, onDelete }) {
  const [newName, setNewName] = useState("");
  const templateNames = Object.keys(templates);

  const handleNew = () => {
    const name = newName.trim();
    if (!name) return;
    onNew(name);
    setNewName("");
  };

  const handleSave = () => {
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
          <span className={`shrink-0 text-xs font-bold ${isDirty ? "text-amber-600" : "text-slate-500"}`}>
            {isDirty ? "当前模板未保存" : "已保存"}
          </span>
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
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
            placeholder="输入模板名"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleNew} variant="soft" className="flex-1">
            <Icon>✨</Icon>空白新建
          </Button>
          <Button onClick={handleSave} variant="purple" className="flex-1">
            <Icon>💾</Icon>保存当前
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
