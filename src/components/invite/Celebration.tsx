import { useEffect, useState } from "react";

const colors = ["bg-blush", "bg-sage", "bg-gold", "bg-primary", "bg-cream"];

/** Balloons and confetti that play once (~6s) and then unmount. */
export function Celebration() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOn(false), 7000);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={`b${i}`} className="absolute bottom-[-120px] animate-rise" style={{ left: `${5 + i * 9.5}%`, animationDelay: `${(i % 5) * 0.35}s` }}>
          <div className={`h-20 w-16 rounded-[50%] ${colors[i % 4]} opacity-80 shadow-lg`} />
          <div className="mx-auto h-16 w-px bg-bark/40" />
        </div>
      ))}
      {Array.from({ length: 36 }).map((_, i) => (
        <span key={`c${i}`} className={`absolute top-0 h-2.5 w-1.5 rounded-sm ${colors[i % 5]} animate-fall`} style={{ left: `${(i * 29) % 100}%`, animationDelay: `${(i % 9) * 0.25}s` }} />
      ))}
      {["🌸", "🍄", "🦊", "🐰", "🌿", "✨"].map((e, i) => (
        <span key={e} className="absolute top-0 text-2xl animate-fall" style={{ left: `${10 + i * 15}%`, animationDelay: `${0.4 + i * 0.4}s` }}>{e}</span>
      ))}
    </div>
  );
}
