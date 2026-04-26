import { useEffect, useRef, useState } from "react";
import { DICE_INTERVAL } from "../constants";
import { rollDiceValue, triggerVibration } from "../utils";

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

// Dice face dot positions: [top-left, top-right, center, bottom-left, bottom-right]
const FACE_DOTS = {
  1: ["center"],
  2: ["top-right", "bottom-left"],
  3: ["top-right", "center", "bottom-left"],
  4: ["top-left", "top-right", "bottom-left", "bottom-right"],
  5: ["top-left", "top-right", "center", "bottom-left", "bottom-right"],
  6: ["top-left", "top-right", "middle-left", "middle-right", "bottom-left", "bottom-right"],
};

function DiceFace({ value }) {
  const dots = FACE_DOTS[value] || [];
  return (
    <div className="relative h-full w-full rounded-2xl bg-gradient-to-b from-white to-slate-100 shadow-inner">
      <div
        className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-1"
        style={{ gridTemplateAreas: `"tl tr tr" "ml c cr" "bl bl br"` }}
      >
        {dots.map((pos) => {
          let style = {};
          if (pos === "center") style = { gridArea: "c", placeSelf: "center" };
          else if (pos === "top-left") style = { gridArea: "tl", alignSelf: "start", justifySelf: "start" };
          else if (pos === "top-right") style = { gridArea: "tr", alignSelf: "start", justifySelf: "end" };
          else if (pos === "middle-left") style = { gridArea: "ml", alignSelf: "center", justifySelf: "start" };
          else if (pos === "middle-right") style = { gridArea: "cr", alignSelf: "center", justifySelf: "end" };
          else if (pos === "bottom-left") style = { gridArea: "bl", alignSelf: "end", justifySelf: "start" };
          else if (pos === "bottom-right") style = { gridArea: "br", alignSelf: "end", justifySelf: "end" };

          return (
            <div
              key={pos}
              className="h-6 w-6 rounded-full bg-slate-800 sm:h-8 sm:w-8"
              style={style}
            />
          );
        })}
      </div>
    </div>
  );
}

// 3D dice cube with CSS transforms
function Dice3D({ value, rolling }) {
  // Map value to face rotations
  // We use a pseudo-3D cube approach with CSS transforms
  // Show 3 visible faces: top/front/right by rotating the cube
  const faceRotation = {
    1: "rotateX(0deg) rotateY(0deg)",   // front face = 1
    2: "rotateX(0deg) rotateY(90deg)",  // right face = 2
    3: "rotateX(-90deg) rotateY(0deg)", // top face = 3
    4: "rotateX(90deg) rotateY(0deg)",  // bottom face = 4
    5: "rotateX(0deg) rotateY(-90deg)", // left face = 5
    6: "rotateX(0deg) rotateY(180deg)", // back face = 6
  };

  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value);
    }
  }, [value, rolling]);

  return (
    <div className="relative h-52 w-52 perspective-[600px] sm:h-56 sm:w-56">
      <div
        className="relative h-full w-full transition-transform duration-200"
        style={{
          transformStyle: "preserve-3d",
          transform: faceRotation[displayValue],
        }}
      >
        {/* Front face = 1 */}
        <div className="absolute inset-0" style={{ transform: "translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={1} />
        </div>
        {/* Right face = 2 */}
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={2} />
        </div>
        {/* Top face = 3 */}
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={3} />
        </div>
        {/* Bottom face = 4 */}
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={4} />
        </div>
        {/* Left face = 5 */}
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={5} />
        </div>
        {/* Back face = 6 */}
        <div className="absolute inset-0" style={{ transform: "rotateY(180deg) translateZ(52px)", backfaceVisibility: "hidden" }}>
          <DiceFace value={6} />
        </div>
      </div>
    </div>
  );
}

export default function DicePage({ addHistory }) {
  const [value, setValue] = useState(1);
  const [rolling, setRolling] = useState(false);
  const rollIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
    };
  }, []);

  const roll = () => {
    if (rolling) return;

    setRolling(true);
    triggerVibration(25);

    if (rollIntervalRef.current) window.clearInterval(rollIntervalRef.current);
    rollIntervalRef.current = window.setInterval(() => {
      const newValue = rollDiceValue();
      setValue(newValue);

      if (rollIntervalRef.current.__count === undefined) rollIntervalRef.current.__count = 0;
      rollIntervalRef.current.__count += 1;

      if (rollIntervalRef.current.__count > 12) {
        window.clearInterval(rollIntervalRef.current);
        rollIntervalRef.current = null;
        const finalValue = newValue;
        setValue(finalValue);
        addHistory("掷骰子", String(finalValue));
        triggerVibration([30, 40, 30]);
        setRolling(false);
      }
    }, DICE_INTERVAL);
  };

  return (
    <Card className="rounded-3xl bg-gradient-to-br from-white to-slate-100">
      <CardContent className="flex min-h-[520px] flex-col items-center justify-center gap-8 p-8 text-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">掷骰子</h2>
          <p className="mt-1 text-sm text-slate-500">适合小游戏、排序、临时惩罚规则。</p>
        </div>

        <div className="relative">
          {/* Rolling animation overlay */}
          <div
            className="transition-transform duration-75"
            style={{
              animation: rolling ? "diceRoll 0.5s ease-in-out infinite" : "none",
              // Add random rotation during roll to simulate 3D tumbling
              transform: rolling
                ? `rotateX(${(Math.floor(Math.random() * 4) + 1) * 90}deg) rotateY(${(Math.floor(Math.random() * 4) + 1) * 90}deg)`
                : "rotateX(0deg) rotateY(0deg)",
            }}
          >
            <Dice3D value={value} rolling={rolling} />
          </div>

          {/* Subtle shadow under the dice */}
          <div
            className={`absolute -bottom-4 left-1/2 h-4 w-48 -translate-x-1/2 rounded-full bg-slate-900/10 blur-sm transition-all duration-300 ${
              rolling ? "scale-110 animate-pulse" : "scale-100"
            }`}
          />
        </div>

        <Button
          onClick={roll}
          disabled={rolling}
          variant="purple"
          className="h-12 w-full max-w-sm rounded-2xl text-base"
        >
          <Icon>🎲</Icon>
          {rolling ? "掷出中..." : "掷一次"}
        </Button>
      </CardContent>
    </Card>
  );
}
