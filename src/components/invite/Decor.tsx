import floral from "@/assets/floral-corner.png";

const fireflies = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: `${(i % 7) * 0.6}s`,
}));

export function Fireflies() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {fireflies.map((f, i) => (
        <span key={i} className="absolute size-1.5 rounded-full bg-gold animate-twinkle shadow-[0_0_12px_4px_var(--gold)]" style={{ left: f.left, top: f.top, animationDelay: f.delay }} />
      ))}
    </div>
  );
}

export function FloralCorner({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return <img src={floral} alt="" aria-hidden width={1024} height={1024} loading="lazy" className={`pointer-events-none select-none ${flip ? "-scale-x-100" : ""} ${className}`} />;
}

export function Butterfly({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 30" className={`animate-float-soft ${className}`}>
      <path d="M20 15 C10 0 0 5 4 14 C0 22 12 28 20 16 C28 28 40 22 36 14 C40 5 30 0 20 15Z" className="fill-blush" opacity=".85" />
      <path d="M20 8 L20 22" className="stroke-bark" strokeWidth="1" />
    </svg>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      {eyebrow && <p className="font-script text-2xl text-primary">{eyebrow}</p>}
      <h2 className="mt-1 text-4xl font-semibold text-bark md:text-5xl">{title}</h2>
      <div className="mx-auto mt-4 flex max-w-xs items-center gap-3">
        <span className="gold-rule flex-1" />
        <span className="text-gold">✦</span>
        <span className="gold-rule flex-1" />
      </div>
    </div>
  );
}
