import { SPIN_DURATION, WHEEL_COLORS } from "../constants";
import { getWheelLabelPosition, totalWeight } from "../utils";

export default function Wheel({
  items,
  spinning,
  selected,
  rotation,
  onSpin,
  justStopped,
  reducedMotion,
}) {
  const weightTotal = totalWeight(items);
  const segments = items.map((item, index) => {
    const start = (totalWeight(items.slice(0, index)) / weightTotal) * 360;
    const size = (item.weight / weightTotal) * 360;
    return {
      ...item,
      start,
      size,
      color: WHEEL_COLORS[index % WHEEL_COLORS.length],
    };
  });
  const background = segments.length
    ? segments
        .map((s) => `${s.color} ${s.start}deg ${s.start + s.size}deg`)
        .join(",")
    : "#28332f 0deg 360deg";
  return (
    <div
      className={`wheel-stage ${spinning ? "is-spinning" : ""} ${justStopped ? "is-winner" : ""}`}
    >
      <div className="wheel-orbit wheel-orbit--outer" aria-hidden="true" />
      <div className="wheel-orbit wheel-orbit--inner" aria-hidden="true" />
      <div className="wheel-machine">
        <div className="wheel-ticks" aria-hidden="true" />
        <div className="wheel-lights" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <i
              key={i}
              style={{ "--angle": `${i * 15}deg`, "--delay": `${i * 0.05}s` }}
            />
          ))}
        </div>
        <div className="wheel-pointer" aria-hidden="true" />
        <div
          className="wheel-disc"
          data-testid="wheel-disc"
          style={{
            background: `conic-gradient(${background})`,
            transform: `rotate(${rotation}deg)`,
            transitionDuration:
              spinning && !reducedMotion ? `${SPIN_DURATION}ms` : "0ms",
          }}
        >
          <svg
            className="wheel-labels"
            viewBox="0 0 400 400"
            aria-hidden="true"
          >
            {segments.map((segment, index) => {
              const p = getWheelLabelPosition(segment.start, segment.size, 131);
              const text = Array.from(segment.name);
              const label =
                text.length > 7
                  ? `${text.slice(0, 6).join("")}…`
                  : segment.name;
              return (
                <g key={index}>
                  {segments.length > 1 && (
                    <line
                      x1="200"
                      y1="200"
                      x2={200 + Math.sin((segment.start * Math.PI) / 180) * 200}
                      y2={200 - Math.cos((segment.start * Math.PI) / 180) * 200}
                      stroke="#111b1c"
                      strokeWidth="2"
                      opacity=".35"
                    />
                  )}
                  {segment.size >= 10 && (
                    <text
                      x={200 + p.x}
                      y={200 + p.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      transform={`rotate(${p.readableAngle},${200 + p.x},${200 + p.y})`}
                      fontSize={segment.size < 25 ? 10 : 14}
                      fill="#14211e"
                      fontWeight="700"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="wheel-sheen" />
        </div>
        <button
          type="button"
          className="wheel-hub"
          onClick={onSpin}
          disabled={!items.length || spinning}
          aria-label={spinning ? "转盘正在选择" : "开始转盘"}
        >
          <span className="wheel-hub-mark">{spinning ? "···" : "GO"}</span>
          <span>{spinning ? "选择中" : "转一下"}</span>
        </button>
      </div>
      <div className="wheel-caption">
        <span className={`status-dot ${spinning ? "status-dot--busy" : ""}`} />
        {spinning
          ? "让好运慢慢停下来"
          : selected
            ? "指针已经替你做了选择"
            : items.length
              ? "点击中心，交给一点随机"
              : "先在选项中添加一个名字"}
      </div>
    </div>
  );
}
