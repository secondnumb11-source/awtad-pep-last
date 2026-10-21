// @ts-nocheck -- ported from original project (looser TS settings)
import { Link } from "@/awtad/nav";
import { useEffect, useState } from "react";
import { sb } from "@/awtad/lib/supabase";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { Row, addDays, addMin, dayOfWeek, lateAfter, n, payRow, shiftFor, today } from "@/awtad/lib/calc";
import { Ic } from "./Icons";

// قوس دائري بأجزاء ملوّنة
function Donut({ segs, total }: { segs: { v: number; c: string }[]; total: number }) {
  const r = 70, c = 2 * Math.PI * r; let off = 0;
  return (
    <svg viewBox="0 0 180 180" width="190" height="190">
      <circle cx="90" cy="90" r={r} fill="none" stroke="#e8edf4" strokeWidth="26" />
      {total > 0 && segs.filter((s) => s.v > 0).map((s, i) => { const len = (s.v / total) * c, el = <circle key={i} cx="90" cy="90" r={r} fill="none" stroke={s.c} strokeWidth="26" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform="rotate(-90 90 90)" />; off += len; return el; })}
      <text x="90" y="92" textAnchor="middle" fontSize="30" fontWeight="700" fill="currentColor">{total}</text>
      <text x="90" y="116" textAnchor="middle" fontSize="13" fill="#7b8794">الإجمالي</text>
    </svg>
  );
}

const Bars = ({ data, total }: { data: [string, number][]; total: number }) => (
  <div>{data.map(([k, v]) => <div className="hbar" key={k}><span>{k}</span><div className="track"><div style={{ width: `${total ? (v / total) * 100 : 0}%` }} /></div><b>{v} ({total ? Math.round((v / total) * 100) : 0}%)</b></div>)}</div>
);
const toMin = (t: string) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };

export function Dashboard() {
  const { d, set } = useData();
  const { user } = useAuth();
  useEffect(() => { if (["admin", "hr"].includes(user?.role || "")) sb.rpc("awtad_birthday_greetings").then(() => {}, () => {}); }, [user?.role]);
  const [aprTab, setAprTab] = useState<"req" | "doc">("req"), [statTab, setStatTab] = useState<"demo" | "org">("demo");
  const all = d.employees || [], emps = all.filter((x) => x.active !== false), t = today(), ym = t.slice(0, 7), lim = addDays(t, 30);
  const A = (d.attendance || []).filter((r) => r.day === t), M = (d.attendance || []).filter((r) => String(r.day).startsWith(ym));
  const onLeave = new Set((d.leaves || []).filter((l) => l.status === "معتمدة" && l.from_date <= t && t <= l.to_date).map((l) => l.employee_id));
  const hol = (d.holidays || []).some((h) => h.day === t), weekend = [5, 6].includes(dayOfWeek(t));
  const byEmp = Object.fromEntries(A.map((r) => [r.employee_id, r]));
  let present = 0, late = 0, early = 0, earlyOut = 0, lateOut = 0;
  emps.forEach((e) => { const r = byEmp[e.id]; if (!r?.check_in) return; const ci = String(r.check_in).slice(0, 5), sh = shiftFor(d, e.id, t), st = sh?.start_time ? String(sh.start_time).slice(0, 5) : set.shift, en = sh?.end_time ? String(sh.end_time).slice(0, 5) : addMin(set.shift, 480);
    if (ci > lateAfter(d, set.shift, e.id, t)) late++; else present++; if (toMin(ci) < toMin(st) - 15) early++;
    if (r.check_out) { const co = String(r.check_out).slice(0, 5); if (toMin(co) < toMin(en)) earlyOut++; else if (toMin(co) > toMin(en) + 60) lateOut++; } });
  const came = present + late, leaveN = emps.filter((e) => !byEmp[e.id]?.check_in && onLeave.has(e.id)).length;
  const notReq = hol ? 0 : weekend ? emps.length - came - leaveN : 0, holN = hol ? emps.length - came - leaveN : 0;
  const absent = Math.max(0, emps.length - came - leaveN - notReq - holN);
  // الالتزام والمقاييس الشهرية
  const days: string[] = []; for (let i = 1; i <= 31; i++) { const x = `${ym}-${String(i).padStart(2, "0")}`; if (new Date(x).getMonth() + 1 !== +ym.slice(5)) break; if (x <= t) days.push(x); }
  const holSet = new Set((d.holidays || []).map((h) => h.day)), work = days.filter((x) => !([5, 6].includes(dayOfWeek(x)) || holSet.has(x)));
  const presentDays = M.filter((r) => r.check_in && work.includes(r.day)).length, expected = emps.length * work.length;
  const leaveDays = (d.leaves || []).filter((l) => l.status === "معتمدة" && l.from_date <= ym + "-31" && l.to_date >= ym + "-01").reduce((a, l) => a + Math.min(l.days, 31), 0);
  const absentDays = Math.max(0, expected - presentDays - leaveDays);
  const hrs = (r: Row) => (r.check_in && r.check_out ? (+new Date(`${r.day}T${r.check_out}`) - +new Date(`${r.day}T${r.check_in}`)) / 36e5 : 0);
  const workH = M.reduce((a, r) => a + Math.max(0, hrs(r)), 0), breakH = M.reduce((a, r) => { const sh = shiftFor(d, r.employee_id, r.day); return a + (r.check_in && sh?.break_start && sh?.break_end ? (toMin(sh.break_end) - toMin(sh.break_start)) / 60 : 0); }, 0);
  const permH = (d.requests || []).filter((r) => r.kind === "استئذان" && r.status === "معتمد" && String(r.req_date || "").startsWith(ym)).reduce((a, r) => a + (+r.hours || 0), 0);
  const commit = expected ? Math.round((presentDays / expected) * 100) : 0;
  const decided = (d.requests || []).filter((r) => (r.approvals || []).length), procH = decided.length ? decided.reduce((a, r) => a + (+new Date(r.approvals[r.approvals.length - 1].at) - +new Date(r.created_at)) / 36e5, 0) / decided.length : 0;
  const hh = (v: number) => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, "0")} ساعة`;
  // الطلبات والوثائق
  const pend = [...(d.requests || []).map((r) => ({ ...r, _k: r.kind })), ...(d.leaves || []).map((r) => ({ ...r, _k: "إجازة " + r.type })), ...(d.expenses || []).map((r) => ({ ...r, _k: "مصروف" }))].filter((r) => String(r.status).startsWith("بانتظار"));
  const docs: [string, string, string][] = []; all.forEach((e) => { [["الإقامة", e.iqama_expiry], ["العقد", e.contract_end]].forEach(([k, v]) => { if (v && (v as string) <= lim) docs.push([e.name, k as string, v as string]); }); });
  (d.documents || []).filter((x) => x.expires_on && x.expires_on <= lim).forEach((x) => docs.push([(all.find((e) => e.id === x.employee_id) || {}).name || "—", x.title, x.expires_on]));
  // إحصائيات سكانية
  const age = (e: Row) => (e.birth_date ? (+new Date(t) - +new Date(e.birth_date)) / 31557600000 : -1);
  const AG: [string, (a: number) => boolean][] = [["< 20 سنة", (a) => a >= 0 && a < 20], ["20-25", (a) => a >= 20 && a < 25], ["25-30", (a) => a >= 25 && a < 30], ["30-35", (a) => a >= 30 && a < 35], ["35-40", (a) => a >= 35 && a < 40], ["40-45", (a) => a >= 40 && a < 45], ["45-50", (a) => a >= 45 && a < 50], ["50-55", (a) => a >= 50 && a < 55], ["+55 سنة", (a) => a >= 55], ["غير معروف", (a) => a < 0]];
  const cnt = (k: string, f?: (e: Row) => string) => { const m: Record<string, number> = {}; emps.forEach((e) => { const v = (f ? f(e) : e[k]) || "غير محدد"; m[v] = (m[v] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]) as [string, number][]; };
  const byDept = cnt("dept").slice(0, 8);
  const K = [
    { v: emps.length, l: "الموظفون النشطون", ic: "users", bg: "#e3f6ec", fg: "#22b573", href: "/employees" },
    { v: all.length - emps.length, l: "الموظفون غير النشطين", ic: "users", bg: "#eef1f6", fg: "#6b7b90", href: "/employees" },
    { v: expected ? commit + "%" : "—", l: "معدل الالتزام بالدوام", ic: "chart", bg: "#fff3e0", fg: "#f6922a", href: "/attendance-report" },
    { v: decided.length ? hh(procH) : "—", l: "وقت معالجة الطلبات", ic: "clock", bg: "#e6f0fb", fg: "#0a6cc2", href: "/requests" },
  ];
  const bdays = emps.filter((x) => x.birth_date && String(x.birth_date).slice(5) === t.slice(5));
  const net = emps.map((x) => payRow(x, set)).reduce((a, r) => a + r.net, 0);
  return (<>
    <div className="welcome"><div><h1>مرحبًا، {user?.name}</h1><div className="mut">لوحة التحكم — {t}</div></div>
      {["admin", "hr"].includes(user?.role || "") && <div className="chipbox"><span className="mut">صافي الرواتب الشهري</span><b>{n(net)} ر.س</b></div>}</div>
    <div className="kgrid">{K.map((k) => (<Link href={k.href} className="kcard" key={k.l}><span className="arrow"><Ic n="chev" s={16} /></span>
      <span className="ktile" style={{ background: k.bg, color: k.fg }}><Ic n={k.ic} s={26} /></span><div className="kv">{k.v}</div><div className="kl">{k.l}</div></Link>))}</div>
    {bdays.length > 0 && <div className="card"><h2>🎂 أعياد ميلاد اليوم</h2>{bdays.map((x) => <span className="chip" key={x.id}>{x.name}</span>)}</div>}
    <div className="two">
      <div className="card"><h2>حضور الموظفين اليوم</h2>
        <div className="donutbox"><Donut total={emps.length} segs={[{ v: present, c: "#22b573" }, { v: late, c: "#f5b324" }, { v: leaveN, c: "#2f80d1" }, { v: absent, c: "#ef5b6b" }, { v: notReq + holN, c: "#c9d3df" }]} />
          <div className="legend">{[["حاضر", present, "#22b573"], ["وصول متأخر", late, "#f5b324"], ["في إجازة", leaveN, "#2f80d1"], ["غائب", absent, "#ef5b6b"], ["غير مطلوب / عطلة", notReq + holN, "#c9d3df"]].map(([l, v, c]) => <div key={l as string}><i style={{ background: c as string }} />{l}<b>{v}</b></div>)}</div></div>
        <div className="mini">{[["وصول مبكر", early], ["انصراف مبكر", earlyOut], ["انصراف متأخر", lateOut], ["وصول متأخر", late]].map(([l, v]) => <span key={l as string}>{l}<b>{v}</b></span>)}</div></div>
      <div className="card"><h2>عدد الموظفين حسب القسم</h2>{byDept.length ? <Bars data={byDept} total={emps.length} /> : <div className="mut">لا توجد بيانات بعد.</div>}</div>
    </div>
    <div className="two">
      <div className="card"><h2>طلبات للموافقة</h2>
        <div className="tabs"><button className={aprTab === "req" ? "on" : ""} onClick={() => setAprTab("req")}>طلبات الموظف <span className="chip">{pend.length}</span></button><button className={aprTab === "doc" ? "on" : ""} onClick={() => setAprTab("doc")}>الوثائق منتهية الصلاحية <span className="chip">{docs.length}</span></button></div>
        {aprTab === "req" ? (pend.length ? pend.slice(0, 6).map((r, i) => <Link className="docrow" href="/requests" key={i}><span>{r._k}</span><span className="wa">{r.status}</span></Link>) : <div className="empty"><Ic n="doc" s={46} /><b>لا توجد طلبات للموافقة</b><span className="mut">يمكنك مراجعة سجل الطلبات السابقة.</span></div>)
          : (docs.length ? docs.slice(0, 6).map((x, i) => <Link className="docrow" href="/rep-docs" key={i}><span>{x[0]} — {x[1]}</span><span className={x[2] < t ? "er" : "wa"}>{x[2]}</span></Link>) : <div className="empty"><Ic n="file" s={46} /><b>لا توجد وثائق تنتهي قريبًا</b></div>)}</div>
      <div className="card"><h2>الحضور والانصراف للشهر الحالي</h2>
        <div className="metrics">{[["ساعات العمل", hh(workH)], ["الإجازات المعتمدة", leaveDays + " أيام"], ["إجمالي الغياب", absentDays + " أيام"], ["ساعات الاستئذان", permH + " ساعة"], ["صافي ساعات العمل", hh(Math.max(0, workH - breakH))], ["ساعات الراحة", hh(breakH)]].map(([l, v]) => <div key={l as string}><span>{l}</span><b>{v}</b></div>)}</div></div>
    </div>
    <div className="card"><h2>إحصائيات إضافية</h2>
      <div className="tabs"><button className={statTab === "demo" ? "on" : ""} onClick={() => setStatTab("demo")}>التركيبة السكانية <span className="chip">4</span></button><button className={statTab === "org" ? "on" : ""} onClick={() => setStatTab("org")}>المؤسسة <span className="chip">3</span></button></div>
      {statTab === "demo" ? <div className="two"><div><h2>التوزيع العمري</h2><Bars data={AG.map(([k, f]) => [k, emps.filter((e) => f(age(e))).length] as [string, number])} total={emps.length} /></div>
        <div><h2>الحالة الاجتماعية</h2><Bars data={cnt("marital_status")} total={emps.length} /><h2 style={{ marginTop: 16 }}>توزيع الجنسيات</h2><Bars data={cnt("nationality").slice(0, 6)} total={emps.length} /><h2 style={{ marginTop: 16 }}>التوزيع حسب الجنس</h2><Bars data={cnt("gender")} total={emps.length} /></div></div>
        : <div className="two"><div><h2>حسب نوع الوظيفة</h2><Bars data={cnt("employment_type")} total={emps.length} /></div><div><h2>حسب المنصب</h2><Bars data={cnt("job").slice(0, 8)} total={emps.length} /><h2 style={{ marginTop: 16 }}>حسب الكيان</h2><Bars data={cnt("entity_id", (e) => (d.entities || []).find((x) => x.id === e.entity_id)?.name || "")} total={emps.length} /></div></div>}</div>
  </>);
}

const TILES: [string, string, string][] = [
  ["لوحة التحكم", "/dashboard", "grid"], ["ملخص اليوم", "/attendance", "clock"], ["إجازات الموظفين", "/leaves", "cal"], ["صلاحية الوثائق", "/employees", "file"],
  ["الهيكل التنظيمي", "/org", "flow"], ["مسير الرواتب", "/payroll", "wal"], ["القيود المحاسبية", "/journal", "rc"], ["مقارنة الرواتب", "/bench", "chart"],
  ["تقييم الأداء", "/reviews", "award"], ["نتائج الاستبيانات", "/responses", "smile"], ["رحلات العمل", "/trips", "plane"], ["حاسبة النطاقات", "/nitaqat", "pin"],
];
export function Reports() {
  const [fav, setFav] = useState<string[]>([]);
  useEffect(() => { try { setFav(JSON.parse(localStorage.getItem("awtad_fav") || "[]")); } catch {} }, []);
  const toggle = (k: string) => { const f = fav.includes(k) ? fav.filter((x) => x !== k) : [...fav, k]; setFav(f); try { localStorage.setItem("awtad_fav", JSON.stringify(f)); } catch {} };
  return (<>
    <div className="banner"><div className="bicon"><Ic n="chart" s={44} /></div><div><h1>التقارير والتحليلات</h1><div className="mut">مجموعة من التقارير والتحليلات الذكية لتساعدك في اتخاذ القرارات</div></div>
      <Link href="/dashboard" className="btn soft">الصفحة الرئيسية</Link></div>
    <div className="tiles">{TILES.map(([t, h, ic]) => (
      <div className="tile" key={h + t}>
        <button className={"star" + (fav.includes(h + t) ? " on" : "")} onClick={() => toggle(h + t)} aria-label="مفضلة"><Ic n="star" s={20} /></button>
        <Link href={h}><Ic n={ic} s={18} /> {t}</Link><span className="arrow"><Ic n="chev" s={14} /></span>
      </div>))}</div></>);
}
