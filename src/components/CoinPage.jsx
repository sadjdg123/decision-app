import { useEffect, useRef, useState } from "react";
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

export default function CoinPage({ addHistory }) {
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
            {/* Front face */}
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
            {/* Back face */}
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
