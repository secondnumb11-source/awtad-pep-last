// رسم توضيحي أصلي (SVG) يتغير لونه حسب الصفحة. يُستبدل بصورة من assets عند توفرها.
export const hueOf = (s: string) => [...s].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
export function Art({ hue = 210 }: { hue?: number }) {
  const c = `hsl(${hue},70%,60%)`, d = `hsl(${hue},60%,35%)`;
  return (
    <svg viewBox="0 0 360 240" style={{ width: "100%", maxWidth: 420 }}>
      <rect x="10" y="10" width="340" height="220" rx="10" fill="#fff" opacity=".96" />
      <rect x="10" y="10" width="70" height="220" rx="10" fill={d} />
      {[40, 70, 100, 130].map((y) => <rect key={y} x="24" y={y} width="42" height="8" rx="3" fill="#fff" opacity=".7" />)}
      {[0, 1, 2].map((i) => <rect key={i} x={96 + i * 80} y="26" width="70" height="42" rx="5" fill={c} opacity={0.5 + i * 0.2} />)}
      {[50, 80, 62, 100, 76, 92].map((v, i) => <rect key={i} x={100 + i * 38} y={200 - v} width="24" height={v} rx="3" fill={d} opacity={0.55 + i * 0.07} />)}
    </svg>
  );
}

import { IMG, imageForPath } from "@/awtad/lib/brand";
const POOL = [IMG.employees, IMG.payroll, IMG.talent, IMG.attendance, IMG.files, IMG.finance, IMG.compliance, IMG.growth, IMG.data, IMG.meeting, IMG.strategy, IMG.home];
// صورة لكل بطاقة ميزة من صور الشركة المرفقة
export function MiniArt({ i, hue, id }: { i: number; hue: number; id?: string }) {
  const src = id ? imageForPath(id) : POOL[(hue + i) % POOL.length];
  return <div className="fimg"><img src={src} alt="" loading="eager" decoding="async" /></div>;
}
