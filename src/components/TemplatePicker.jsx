import { useState } from "react";
import { Button, Icon, Panel } from "./UI";

export default function TemplatePicker({
  title,
  templates,
  activeName,
  isDirty,
  onChoose,
  onNew,
  onSave,
  onDelete,
  disabled,
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const create = () => {
    const name = newName.trim();
    if (!name) return setError("先给模板起个名字。");
    if (Object.hasOwn(templates, name))
      return setError("这个名字已存在，换一个名字或保存当前模板。");
    if (onNew(name) === false) return;
    setNewName("");
    setError("");
  };
  const save = () => {
    const name = newName.trim() || activeName;
    if (!name) return setError("先给模板起个名字。");
    if (name !== activeName && Object.hasOwn(templates, name))
      return setError("这个名字已存在，请换一个名字。");
    onSave(name);
    setNewName("");
    setError("");
  };
  return (
    <Panel className="templates-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">YOUR COLLECTION</span>
          <h3>{title}</h3>
        </div>
        <span className={isDirty ? "save-state is-dirty" : "save-state"}>
          {isDirty ? "未保存" : "已保存"}
        </span>
      </div>
      <fieldset disabled={disabled}>
        <div className="template-chips">
          {Object.keys(templates).map((name) => (
            <button
              type="button"
              key={name}
              onClick={() => onChoose(name)}
              aria-pressed={name === activeName}
              className={`template-chip ${name === activeName ? "is-active" : ""}`}
            >
              {name}
            </button>
          ))}
        </div>
        {!Object.keys(templates).length && (
          <p className="muted small">创建一份名单，下次直接用。</p>
        )}
        <input
          className="template-input"
          value={newName}
          maxLength={40}
          onChange={(e) => {
            setNewName(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              save();
            }
          }}
          placeholder={
            activeName ? "新名字（留空保存当前模板）" : "输入模板名称"
          }
          aria-label="模板名称"
        />
        <div className="template-actions">
          <Button variant="soft" onClick={create}>
            <Icon name="plus" size={16} />
            空白新建
          </Button>
          <Button variant="mint" onClick={save}>
            <Icon name="save" size={16} />
            保存当前
          </Button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {activeName && (
          <button
            type="button"
            className="text-button delete-template"
            onClick={() => {
              if (window.confirm(`删除模板“${activeName}”？`))
                onDelete(activeName);
            }}
          >
            <Icon name="trash" size={14} />
            删除当前模板
          </button>
        )}
      </fieldset>
    </Panel>
  );
}
