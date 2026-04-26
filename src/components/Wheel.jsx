import { useMemo } from "react";
import { sanitizeItems, totalWeight, getWheelLabelPosition } from "../utils";

export default function Wheel({ items, spinning, selected, rotation, onSpin }) {
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
        color: `hsl(${(index * 47 + 255) % 360} 82% 62%)`,
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
