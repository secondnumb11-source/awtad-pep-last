// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useEffect, useRef, useState } from "react";

// مشهد ثلاثي الأبعاد يميل مع حركة الماوس
export function TiltScene({ children }: { children: ReactNode }) {
  const [t, setT] = useState("");
  return (
    <div className="scene"
      onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; setT(`rotateY(${-x * 22}deg) rotateX(${y * 18}deg)`); }}
      onMouseLeave={() => setT("")}>
      <div className={"tilt" + (t ? "" : " fl")} style={t ? { transform: t } : undefined}>{children}</div>
    </div>
  );
}

// ظهور تدريجي عند التمرير
export function Reveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => es.forEach((x) => x.isIntersecting && (setOn(true), io.disconnect())), { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={"rv" + (on ? " in" : "")}>{children}</div>;
}

// عدّاد متحرك
export function Counter({ to, prefix = "" }: { to: number; prefix?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); let k = 0; const id = setInterval(() => { k += Math.ceil(to / 40); setV(Math.min(k, to)); if (k >= to) clearInterval(id); }, 25); } });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <b ref={ref}>{prefix}{v}</b>;
}
