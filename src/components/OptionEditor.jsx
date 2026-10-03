import { useId, useState } from "react";
import { MAX_WEIGHT, WHEEL_COLORS } from "../constants";
import { Button, Icon, Panel } from "./UI";

export default function OptionEditor({
  items,
  setItems,
  placeholder,
  templates,
  disabled,
}) {
  const [text, setText] = useState("");
  const listId = useId();
  const allNames = [
    ...new Set(
      Object.values(templates)
        .flat()
        .map((item) => item.name),
    ),
  ];
  const total = items.reduce((sum, item) => sum + Number(item.weight), 0);
  const addItem = () => {
    if (disabled || !text.trim()) return;
    const name = text.trim();
    setItems((prev) => {
      const existing = prev.findIndex((item) => item.name.trim() === name);
      return existing < 0
        ? [...prev, { name, weight: 1 }]
        : prev.map((item, i) =>
            i === existing
              ? { ...item, weight: Math.min(MAX_WEIGHT, item.weight + 1) }
              : item,
          );
    });
    setText("");
  };
  return (
    <Panel className="editor-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">THE POSSIBILITIES</span>
          <h3>选项设置</h3>
        </div>
        <span className="count-badge">
          {items.length.toString().padStart(2, "0")}
        </span>
      </div>
      <p className="muted small">支持人数越多，被抽中的概率越高。</p>
      <fieldset disabled={disabled}>
        <div className="add-option">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addItem();
              }
            }}
            list={listId}
            placeholder={placeholder}
            aria-label="新选项名称"
            maxLength={80}
          />
          <Button
            onClick={addItem}
            disabled={!text.trim() || disabled}
            aria-label="添加选项"
          >
            <Icon name="plus" />
          </Button>
        </div>
        <datalist id={listId}>
          {allNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <div className="option-list">
          {items.map((item, index) => (
            <div className="option-row" key={index}>
              <i
                className="option-dot"
                style={{
                  background: WHEEL_COLORS[index % WHEEL_COLORS.length],
                }}
              />
              <div className="option-name">
                <input
                  value={item.name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((entry, i) =>
                        i === index
                          ? { ...entry, name: e.target.value }
                          : entry,
                      ),
                    )
                  }
                  list={listId}
                  aria-label={`选项 ${index + 1} 名称`}
                  maxLength={80}
                />
                <div className="probability-line">
                  <i
                    style={{
                      width: `${total ? (item.weight / total) * 100 : 0}%`,
                      background: WHEEL_COLORS[index % WHEEL_COLORS.length],
                    }}
                  />
                </div>
              </div>
              <select
                value={item.weight}
                onChange={(e) =>
                  setItems((prev) =>
                    prev.map((entry, i) =>
                      i === index
                        ? { ...entry, weight: Number(e.target.value) }
                        : entry,
                    ),
                  )
                }
                aria-label={`${item.name} 的支持人数`}
              >
                {Array.from({ length: MAX_WEIGHT }, (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}人
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="icon-button delete-option"
                aria-label={`删除 ${item.name}`}
                onClick={() =>
                  setItems((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
        {!items.length && (
          <p className="empty-state">候选名单还是空的，添加第一个选项。</p>
        )}
      </fieldset>
      <div className="editor-foot">
        <span>
          {disabled ? "抽选中，选项暂时锁定" : "同名选项会合并支持人数"}
        </span>
        <span>{total} 票</span>
      </div>
    </Panel>
  );
}
