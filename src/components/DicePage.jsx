import { useEffect, useRef, useState, useCallback } from "react";
import { triggerVibration } from "../utils";

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

// Standard dice pip positions for each face value
const FACE_PIPS = {
  1: ["center"],
  2: ["ne", "sw"],
  3: ["ne", "center", "sw"],
  4: ["nw", "ne", "sw", "se"],
  5: ["nw", "ne", "center", "sw", "se"],
  6: ["nw", "ne", "mw", "me", "sw", "se"],
};

const PIP_STYLES = {
  nw:  { top: "12%", left: "12%" },
  ne:  { top: "12%", right: "12%" },
  center: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" },
  mw:  { top: "50%", left: "12%", transform: "translateY(-50%)" },
  me:  { top: "50%", right: "12%", transform: "translateY(-50%)" },
  sw:  { bottom: "12%", left: "12%" },
  se:  { bottom: "12%", right: "12%" },
};

// Single dice face panel with pips
function DicePanel({ value, faceColor = "bg-white" }) {
  const pips = FACE_PIPS[value] || [];
  return (
    <div className={`relative h-full w-full rounded-xl ${faceColor} shadow-inner`}>
      {pips.map((pos) => (
        <div
          key={pos}
          className="absolute h-[18%] w-[18%] rounded-full bg-slate-800 shadow-sm"
          style={PIP_STYLES[pos]}
        />
      ))}
    </div>
  );
}

// True 3D dice cube — shows 3 faces at once: front, right, top
// Using CSS 3D transforms with perspective
function Dice3D({ value, rolling, animProgress }) {
  // Map value (1-6) to cube orientation so front face shows the right number
  // We rotate the cube so the desired face ends up on "front"
  // Cube has faces: front, back, left, right, top, bottom
  const faceMap = {
    // value -> cube transform to bring that face to front
    1: "rotateY(0deg)",
    2: "rotateY(-90deg)",
    3: "rotateX(-90deg)",
    4: "rotateX(90deg)",
    5: "rotateY(90deg)",
    6: "rotateY(180deg)",
  };

  // During rolling: spin the cube with deceleration easing
  const rollingRotate = rolling
    ? `rotateX(${animProgress * 720}deg) rotateY(${animProgress * 1080}deg) rotateZ(${animProgress * 360}deg)`
    : faceMap[value] || faceMap[1];

  return (
    <div className="relative h-20 w-20 sm:h-24 sm:w-24" style={{ perspective: "400px" }}>
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transition: rolling ? "none" : "transform 0.3s ease-out",
          transform: rollingRotate,
        }}
      >
        {/* Front face (1) */}
        <div className="absolute inset-0" style={{ transform: "translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={1} />
        </div>
        {/* Right face (2) */}
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={2} />
        </div>
        {/* Top face (3) */}
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={3} />
        </div>
        {/* Bottom face (4) */}
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={4} />
        </div>
        {/* Left face (5) */}
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={5} />
        </div>
        {/* Back face (6) */}
        <div className="absolute inset-0" style={{ transform: "rotateY(180deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={6} />
        </div>
      </div>
    </div>
  );
}

// Separate rolling cube — pure animation only, no final value shown until done
function RollingDice3D({ animProgress }) {
  return (
    <div className="relative h-20 w-20 sm:h-24 sm:w-24" style={{ perspective: "400px" }}>
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${animProgress * 720}deg) rotateY(${animProgress * 1080}deg) rotateZ(${animProgress * 360}deg)`,
        }}
      >
        {/* Front */}
        <div className="absolute inset-0" style={{ transform: "translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={1} />
        </div>
        {/* Right */}
        <div className="absolute inset-0" style={{ transform: "rotateY(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={2} />
        </div>
        {/* Top */}
        <div className="absolute inset-0" style={{ transform: "rotateX(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={3} />
        </div>
        {/* Bottom */}
        <div className="absolute inset-0" style={{ transform: "rotateX(90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={4} />
        </div>
        {/* Left */}
        <div className="absolute inset-0" style={{ transform: "rotateY(-90deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={5} />
        </div>
        {/* Back */}
        <div className="absolute inset-0" style={{ transform: "rotateY(180deg) translateZ(40px)", backfaceVisibility: "hidden" }}>
          <DicePanel value={6} />
        </div>
      </div>
    </div>
  );
}

// Easing function for smooth deceleration
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export default function DicePage({ addHistory }) {
  const [diceCount, setDiceCount] = useState(1);
  const [values, setValues] = useState([1]);
  const [rolling, setRolling] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const rollStartRef = useRef(null);
  const rafRef = useRef(null);
  const TOTAL_DURATION = 1050; // ms total animation

  // Generate random dice values
  const randomValues = useCallback((count) => {
    return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const roll = () => {
    if (rolling) return;

    setRolling(true);
    triggerVibration(25);
    setAnimProgress(0);

    // Rapid random value updates during roll
    const rapidInterval = setInterval(() => {
      setValues(randomValues(diceCount));
    }, 60);

    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / TOTAL_DURATION, 1);
      setAnimProgress(easeOut(progress));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        clearInterval(rapidInterval);
        // Set final values
        const finalVals = randomValues(diceCount);
        setValues(finalVals);
        setRolling(false);

        // Write history
        const sum = finalVals.reduce((a, b) => a + b, 0);
        if (diceCount === 1) {
          addHistory("掷骰子", String(sum));
        } else {
          addHistory("掷骰子", finalVals.join(" + ") + " = " + sum);
        }
        triggerVibration([30, 40, 30]);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  };

  const changeDiceCount = (delta) => {
    if (rolling) return;
    const next = Math.max(1, Math.min(6, diceCount + delta));
    if (next === diceCount) return;
    setDiceCount(next);
    setValues(Array(next).fill(1));
  };

  const sum = values.reduce((a, b) => a + b, 0);

  return (
    <Card className="rounded-3xl bg-gradient-to-br from-white to-slate-100">
      <CardContent className="flex min-h-[560px] flex-col items-center justify-center gap-6 p-8 text-center">
        <div>
          <h2 className="text-2xl font-black text-slate-900">掷骰子</h2>
          <p className="mt-1 text-sm text-slate-500">适合小游戏、排序、临时惩罚规则。</p>
        </div>

        {/* Dice count controls */}
        <div className="flex items-center gap-4">
          <Button
            variant="soft"
            className="h-10 w-10 rounded-full !p-0 text-xl font-black"
            onClick={() => changeDiceCount(-1)}
            disabled={rolling || diceCount <= 1}
          >
            −
          </Button>
          <div className="flex min-w-[80px] flex-col items-center">
            <span className="text-2xl font-black text-slate-900">{diceCount}</span>
            <span className="text-xs text-slate-500">{diceCount === 1 ? "个骰子" : "个骰子"}</span>
          </div>
          <Button
            variant="soft"
            className="h-10 w-10 rounded-full !p-0 text-xl font-black"
            onClick={() => changeDiceCount(1)}
            disabled={rolling || diceCount >= 6}
          >
            +
          </Button>
        </div>

        {/* Dice display */}
        <div className="relative">
          {/* Shadow */}
          <div
            className={`absolute -bottom-3 left-1/2 h-4 w-48 -translate-x-1/2 rounded-full bg-slate-900/15 blur-sm transition-all duration-150 ${
              rolling ? "scale-125 opacity-60" : "scale-100 opacity-40"
            }`}
          />

          {/* Dice row */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {rolling
              ? Array.from({ length: diceCount }, (_, i) => (
                  <RollingDice3D key={i} animProgress={animProgress + i * 0.15} />
                ))
              : values.map((v, i) => (
                  <Dice3D key={i} value={v} rolling={false} />
                ))}
          </div>
        </div>

        {/* Sum display */}
        {diceCount > 1 && (
          <div className="rounded-2xl bg-slate-900 px-8 py-3 text-2xl font-black text-white shadow-lg">
            总和：<span className="text-yellow-400">{sum}</span>
          </div>
        )}

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
