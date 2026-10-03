const paths = {
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 3v7m0 4v7M3 12h7m4 0h7M5.6 5.6l5 5m2.8 2.8 5 5M5.6 18.4l5-5m2.8-2.8 5-5" />
    </>
  ),
  people: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      <circle cx="9" cy="7" r="4" />
    </>
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12m3-9h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
    </>
  ),
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path
        d="M8 8h.01M16 8h.01M12 12h.01M8 16h.01M16 16h.01"
        strokeWidth="3"
      />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: <path d="m5 12 4 4L19 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  history: (
    <>
      <path d="M3 11a9 9 0 1 1 2.6 7M3 4v7h7M12 7v5l3 2" />
    </>
  ),
  save: (
    <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8" />
    </>
  ),
};

export function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.wheel}
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  return (
    <button
      type="button"
      className={`button button--${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = "", ...props }) {
  return (
    <section className={`panel ${className}`} {...props}>
      {children}
    </section>
  );
}

export function Confetti({ active }) {
  if (!active) return null;
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 26 }, (_, i) => (
        <i
          key={i}
          style={{
            "--x": `${5 + ((i * 37) % 90)}%`,
            "--delay": `${(i % 5) * 0.06}s`,
            "--drift": `${(i % 2 ? 1 : -1) * (18 + i * 3)}px`,
            "--turn": `${i * 61}deg`,
            background: ["#ff9d64", "#c5f7bc", "#a4bdff", "#e0b9ff"][i % 4],
          }}
        />
      ))}
    </div>
  );
}
