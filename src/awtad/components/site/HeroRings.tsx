import { useEffect, useRef } from "react";
import { logoWhite } from "@/awtad/components/site/Brand";

/** شعار أوتاد الفهد ثلاثي الأبعاد: طبقات عمق متراكبة، يميل مع حركة الماوس، مع هالة ولمعان ينساب. */
export function HeroRings() {
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stage.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, tx = 0, ty = 0, x = 0, y = 0;
    const mv = (e: PointerEvent) => { tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = (e.clientY / window.innerHeight - 0.5) * 2; };
    const tick = (t: number) => {
      x += (tx - x) * 0.06; y += (ty - y) * 0.06;
      // A full, uninterrupted revolution, with restrained pointer response.
      el.style.setProperty("--ry", `${t * 0.018 + x * 8}deg`);
      el.style.setProperty("--fy", `${Math.sin(t * 0.0011) * 6}px`);
      el.style.setProperty("--rx", `${-y * 8 - 6}deg`);
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", mv);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("pointermove", mv); };
  }, []);
  const depth = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div className="logo3d" aria-hidden="true">
      <div className="l3-stage" ref={stage}>
        {depth.map((i) => <img key={i} src={logoWhite} alt="" className="l3-layer" style={{ ["--z" as string]: `${-i * 2.2}px`, ["--k" as string]: i / 21 }} />)}
        <div className="l3-face"><img src={logoWhite} alt="" /><span className="l3-shine" style={{ ["--m" as string]: `url(${logoWhite})` }} /></div>
      </div>
    </div>
  );
}
