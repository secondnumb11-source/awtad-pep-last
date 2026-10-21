// @ts-nocheck -- ported from original project (looser TS settings)
import { Link } from "@/awtad/nav";
import { ReactNode, useEffect, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, T, ins, upd } from "@/awtad/lib/supabase";
import { Row, addDays, dayOfWeek, n, today } from "@/awtad/lib/calc";
import { Ic } from "./Icons";
import { ExportBar } from "./ExportBar";
import { nodeText } from "@/awtad/lib/export";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
const Tbl = ({ head, rows, empty = "لا توجد بيانات" }: { head: string[]; rows: ReactNode[][]; empty?: string }) => (
  <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar head={head} rows={rows.map((r) => r.map(nodeText))} /></div><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>
    {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}{!rows.length && <tr><td colSpan={head.length} className="mut">{empty}</td></tr>}</tbody></table></div>
);
const csv = (name: string, rows: (string | number)[][]) => { const t = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/csv;charset=utf-8" })); a.download = name; a.click(); };
const activeEmps = (d: Record<string, Row[]>) => (d.employees || []).filter((x) => x.active !== false);
const daysBetween = (a: string, b: string) => Math.round((+new Date(b) - +new Date(a)) / 864e5) + 1;

// رصيد الإجازة السنوية: المستحق المتراكم + المرحَّل − المستثنى − المستخدم
export function leaveCalc(d: Record<string, Row[]>, e: Row, year: number) {
  const jd = e.join_date ? new Date(e.join_date) : null, ys = new Date(year, 0, 1), from = jd && jd > ys ? jd : ys;
  const end = year === new Date().getFullYear() ? new Date() : new Date(year, 11, 31);
  const days = Math.max(0, (+end - +from) / 864e5 + 1), yrs = jd ? (+end - +jd) / 31557600000 : 0;
  const pol = (d.leave_policies || []).find((p) => p.kind === "سنوية"), quota = pol ? +pol.days : yrs >= 5 ? 30 : 21;
  const adj = (d.leave_adjustments || []).filter((a) => a.employee_id === e.id && a.year === year), sum = (k: string) => adj.filter((a) => a.kind === k).reduce((s, a) => s + +a.days, 0);
  const used = (d.leaves || []).filter((l) => l.employee_id === e.id && l.type === "سنوية" && l.status === "معتمدة" && String(l.from_date).startsWith(String(year))).reduce((s, l) => s + l.days, 0);
  const accrued = (quota * Math.min(days, 365)) / 365, carry = sum("ترحيل"), exempt = sum("استثناء");
  return { quota, accrued, carry, exempt, used, balance: accrued + carry - exempt - used };
}

export function RepToday() {
  const { d } = useData(); const t = today();
  const A = Object.fromEntries((d.attendance || []).filter((r) => r.day === t).map((r) => [r.employee_id, r]));
  const onLeave = new Set((d.leaves || []).filter((l) => l.status === "معتمدة" && l.from_date <= t && t <= l.to_date).map((l) => l.employee_id));
  const emps = activeEmps(d), hol = (d.holidays || []).find((h) => h.day === t);
  const st = (e: Row) => (A[e.id]?.check_in ? "حاضر" : onLeave.has(e.id) ? "في إجازة" : hol ? "يوم عطلة" : [5, 6].includes(dayOfWeek(t)) ? "غير مطلوب" : "غائب");
  const cnt = (s: string) => emps.filter((e) => st(e) === s).length;
  return (<><div className="grid">{["حاضر", "غائب", "في إجازة", "غير مطلوب", "يوم عطلة"].map((s) => <div className="card kpi" key={s}><div className="num">{cnt(s)}</div><div className="mut">{s}</div></div>)}</div>
    <Tbl head={["الموظف", "القسم", "الحالة", "دخول", "خروج"]} rows={emps.map((e) => [e.name, e.dept, st(e), String(A[e.id]?.check_in || "—").slice(0, 5), String(A[e.id]?.check_out || "—").slice(0, 5)])} /></>);
}

export function RepMap() {
  const { d, emp } = useData(); const t = today();
  const pts = (d.attendance || []).filter((r) => r.day === t && r.lat != null);
  const locs = (d.locations || []).filter((l) => l.lat != null);
  const all = [...pts.map((p) => [+p.lat, +p.lng]), ...locs.map((l) => [+l.lat, +l.lng])];
  if (!all.length) return <div className="card mut">لا توجد نقاط تسجيل اليوم، ولا مواقع بإحداثيات. يظهر الموقع عندما يسجّل موظف حضوره من المتصفح.</div>;
  const la = all.map((x) => x[0]), lo = all.map((x) => x[1]), [a0, a1, o0, o1] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)];
  const X = (v: number) => 40 + (o1 === o0 ? 0.5 : (v - o0) / (o1 - o0)) * 520, Y = (v: number) => 260 - (a1 === a0 ? 0.5 : (v - a0) / (a1 - a0)) * 220;
  return (<><div className="card"><h2>خريطة حضور اليوم</h2><div className="mut">رسم نقطي نسبي لمواقع التسجيل (لا خريطة جغرافية). المربعات = مواقع العمل، النقاط = تسجيلات الموظفين.</div>
    <svg viewBox="0 0 600 300" style={{ width: "100%", background: "var(--pr2)", borderRadius: 12 }}>
      {locs.map((l) => <g key={l.id}><rect x={X(+l.lng) - 7} y={Y(+l.lat) - 7} width="14" height="14" fill="#0a6cc2" /><text x={X(+l.lng) + 10} y={Y(+l.lat) + 4} fontSize="11" fill="currentColor">{l.name}</text></g>)}
      {pts.map((p) => <g key={p.id}><circle cx={X(+p.lng)} cy={Y(+p.lat)} r="6" fill={p.in_range === false ? "#ef5b6b" : "#22b573"} /><title>{emp(p.employee_id)}</title></g>)}</svg></div>
    <Tbl head={["الموظف", "الدخول", "الموقع"]} rows={pts.map((p) => [emp(p.employee_id), String(p.check_in || "").slice(0, 5), <a key={p.id} className="ok" href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">فتح الخريطة</a>])} /></>);
}

export function RepLocations() {
  const { d } = useData(); const ym = today().slice(0, 7);
  const A = (d.attendance || []).filter((r) => String(r.day).startsWith(ym));
  return <Tbl head={["الموقع", "النوع", "النطاق (م)", "التسجيلات هذا الشهر", "ضمن النطاق", "موظفون مختلفون"]} rows={(d.locations || []).map((l) => { const r = A.filter((a) => a.location_id === l.id); return [l.name, l.kind, l.radius_m, r.length, r.length ? Math.round((r.filter((a) => a.in_range).length / r.length) * 100) + "%" : "—", new Set(r.map((a) => a.employee_id)).size]; })} empty="عرّف مواقع العمل أولًا" />;
}

export function RepSearch() {
  const { d } = useData();
  const [q, setQ] = useState(""), [dept, setDept] = useState(""), [nat, setNat] = useState(""), [gen, setGen] = useState(""), [st, setSt] = useState("");
  const all = d.employees || [], uniq = (k: string) => Array.from(new Set(all.map((x) => x[k]).filter(Boolean)));
  const rows = all.filter((e) => (!q || [e.name, e.job, e.email, e.national_id].some((v) => String(v || "").includes(q))) && (!dept || e.dept === dept) && (!nat || e.nationality === nat) && (!gen || e.gender === gen) && (!st || (st === "نشط") === (e.active !== false)));
  const sel = (v: string, set: (s: string) => void, opts: any[]) => <select value={v} onChange={(e) => set(e.target.value)}><option value="">الكل</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  return (<><div className="card"><h2>بحث متعدد المعايير</h2><div className="row"><Field l="نص (اسم، مسمى، بريد، هوية)"><input value={q} onChange={(e) => setQ(e.target.value)} /></Field><Field l="القسم">{sel(dept, setDept, uniq("dept"))}</Field><Field l="الجنسية">{sel(nat, setNat, uniq("nationality"))}</Field><Field l="الجنس">{sel(gen, setGen, ["ذكر", "أنثى"])}</Field><Field l="الحالة">{sel(st, setSt, ["نشط", "غير نشط"])}</Field>
    <button className="btn" onClick={() => csv("awtad-search.csv", [["الاسم", "القسم", "المسمى", "الجنسية", "الجنس", "البريد"], ...rows.map((e) => [e.name, e.dept, e.job, e.nationality, e.gender, e.email])])}>تنزيل CSV</button></div><div className="mut">{rows.length} نتيجة</div></div>
    <Tbl head={["الموظف", "القسم", "المسمى", "الجنسية", "الجنس", "الحالة"]} rows={rows.map((e) => [e.name, e.dept, e.job, e.nationality, e.gender, e.active !== false ? "نشط" : "غير نشط"])} /></>);
}

export function RepVisits() {
  const { d, emp } = useData();
  const by: Record<string, number> = {}; (d.field_reports || []).forEach((r) => { const k = String(r.created_at || "").slice(0, 10); by[k] = (by[k] || 0) + 1; });
  return (<><Tbl head={["اليوم", "عدد الزيارات / التقارير"]} rows={Object.entries(by).sort().reverse().slice(0, 30).map(([k, v]) => [k, v])} empty="لا توجد زيارات مسجّلة" />
    <Tbl head={["الموظف", "العنوان", "التاريخ"]} rows={[...(d.field_reports || [])].reverse().slice(0, 30).map((r) => [emp(r.employee_id), r.title, String(r.created_at || "").slice(0, 10)])} /></>);
}

export function RepDocs() {
  const { d, emp } = useData(); const t = today();
  const items: [string, string, string, string][] = [];
  activeEmps(d).forEach((e) => { [["الإقامة", e.iqama_expiry], ["العقد", e.contract_end], ["فترة التجربة", e.probation_end]].forEach(([k, v]) => { if (v) items.push([e.name, k as string, v as string, "ملف الموظف"]); }); });
  (d.documents || []).filter((x) => x.expires_on).forEach((x) => items.push([emp(x.employee_id), x.title, x.expires_on, x.kind]));
  items.sort((a, b) => a[2].localeCompare(b[2]));
  return <Tbl head={["الموظف", "الوثيقة", "تاريخ الانتهاء", "الأيام المتبقية", "الحالة"]} rows={items.map((i) => { const left = Math.round((+new Date(i[2]) - +new Date(t)) / 864e5); return [i[0], `${i[1]} (${i[3]})`, i[2], left, <span key={i[0] + i[1]} className={left < 0 ? "er" : left <= 30 ? "wa" : "ok"}>{left < 0 ? "منتهية" : left <= 30 ? "تنتهي قريبًا" : "سارية"}</span>]; })} empty="لا توجد وثائق بتواريخ انتهاء" />;
}

export function RepEmpLeaves() {
  const { d } = useData(); const emps = activeEmps(d), [id, setId] = useState("");
  const e = emps.find((x) => String(x.id) === (id || String(emps[0]?.id))), L = (d.leaves || []).filter((l) => e && l.employee_id === e.id);
  const byType: Record<string, number> = {}; L.filter((l) => l.status === "معتمدة").forEach((l) => (byType[l.type] = (byType[l.type] || 0) + l.days));
  return (<><div className="card"><h2>إجازات موظف</h2><Field l="الموظف"><select value={id || String(emps[0]?.id ?? "")} onChange={(x) => setId(x.target.value)}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <div style={{ marginTop: 10 }}>{Object.entries(byType).map(([k, v]) => <span className="chip" key={k}>{k}: {v} يوم</span>)}</div></div>
    <Tbl head={["النوع", "من", "إلى", "الأيام", "الحالة"]} rows={L.map((l) => [l.type, l.from_date, l.to_date, l.days, l.status])} /></>);
}

export function RepMonthLeaves() {
  const { d, emp } = useData(); const [ym, setYm] = useState(today().slice(0, 7));
  const a = ym + "-01", b = ym + "-31";
  const rows = (d.leaves || []).filter((l) => l.status === "معتمدة" && l.from_date <= b && l.to_date >= a).map((l) => { const s = l.from_date > a ? l.from_date : a, e = l.to_date < b ? l.to_date : b; return [emp(l.employee_id), l.type, l.from_date, l.to_date, daysBetween(s, e)]; });
  return (<><div className="card"><Field l="الشهر"><input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></Field></div><Tbl head={["الموظف", "النوع", "من", "إلى", "أيام داخل الشهر"]} rows={rows} /></>);
}

export function RepOverlap() {
  const { d, emp } = useData();
  const L = (d.leaves || []).filter((l) => l.status !== "مرفوضة"), dept = (id: any) => (d.employees || []).find((e) => e.id === id)?.dept || "";
  const out: ReactNode[][] = [];
  for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) { const x = L[i], y = L[j]; if (x.employee_id !== y.employee_id && dept(x.employee_id) && dept(x.employee_id) === dept(y.employee_id) && x.from_date <= y.to_date && y.from_date <= x.to_date) out.push([dept(x.employee_id), emp(x.employee_id), `${x.from_date} → ${x.to_date}`, emp(y.employee_id), `${y.from_date} → ${y.to_date}`]); }
  return <Tbl head={["القسم", "الموظف الأول", "فترته", "الموظف الثاني", "فترته"]} rows={out} empty="لا توجد إجازات متداخلة داخل الأقسام" />;
}

export function RepReturn() {
  const { d, emp, reload } = useData(); const { user } = useAuth(); const t = today(), [msg, setMsg] = useState("");
  const L = (d.leaves || []).filter((l) => l.status === "معتمدة" && l.to_date >= addDays(t, -7) && l.to_date <= addDays(t, 30)).sort((a, b) => a.to_date.localeCompare(b.to_date));
  const ok = ["admin", "hr", "manager"].includes(user?.role || "");
  async function back(l: Row) { try { await upd("leaves", l.id, { returned_on: today() }); await reload(); } catch (e: any) { setMsg(e.message); } }
  return (<>{msg && <div className="card er">{msg}</div>}<Tbl head={["الموظف", "النوع", "تنتهي في", "العودة المتوقعة", "الحالة", ""]} rows={L.map((l) => { const late = !l.returned_on && addDays(l.to_date, 1) < t; return [emp(l.employee_id), l.type, l.to_date, addDays(l.to_date, 1), l.returned_on ? <span key="a" className="ok">عاد في {l.returned_on}</span> : late ? <span key="b" className="er">لم يعد (متأخر)</span> : <span key="c" className="wa">بانتظار العودة</span>, ok && !l.returned_on ? <button key="d" className="btn sm" onClick={() => back(l)}>تأكيد العودة</button> : ""]; })} empty="لا توجد إجازات تنتهي قريبًا" /></>);
}

export function RepEntitle() {
  const { d } = useData(); const y = new Date().getFullYear();
  return <Tbl head={["الموظف", "الاستحقاق السنوي", "المتراكم حتى اليوم", "المرحَّل", "المستثنى", "المستخدم", "الرصيد"]} rows={activeEmps(d).map((e) => { const c = leaveCalc(d, e, y); return [e.name, c.quota, n(c.accrued), n(c.carry), n(c.exempt), c.used, <b key={e.id} className={c.balance < 0 ? "er" : ""}>{n(c.balance)}</b>]; })} />;
}

export function RepBalance() {
  const { d } = useData(); const y = new Date().getFullYear();
  const pols = d.leave_policies || [];
  return (<><Tbl head={["الموظف", "السنوية: الرصيد", ...pols.filter((p) => p.kind !== "سنوية").map((p) => `${p.kind}: المتبقي`)]} rows={activeEmps(d).map((e) => [e.name, n(leaveCalc(d, e, y).balance), ...pols.filter((p) => p.kind !== "سنوية").map((p) => Math.max(0, p.days - (d.leaves || []).filter((l) => l.employee_id === e.id && l.type === p.kind && l.status === "معتمدة" && String(l.from_date).startsWith(String(y))).reduce((s, l) => s + l.days, 0)))])} />
    <div className="card mut">أنواع الإجازات الأخرى تظهر عند تعريف سياساتها من «سياسات الإجازات».</div></>);
}

export function RepCarry() {
  const { d, emp, reload } = useData(); const y = new Date().getFullYear(), [cap, setCap] = useState(10), [msg, setMsg] = useState("");
  const rows = activeEmps(d).map((e) => ({ e, b: leaveCalc(d, e, y).balance })), has = (id: any) => (d.leave_adjustments || []).some((a) => a.employee_id === id && a.year === y + 1 && a.kind === "ترحيل");
  async function carry() {
    let k = 0; try { for (const r of rows) if (r.b > 0 && !has(r.e.id)) { await ins("leave_adjustments", { employee_id: r.e.id, year: y + 1, kind: "ترحيل", days: Math.min(Math.floor(r.b), cap), note: `ترحيل من ${y}` }); k++; } setMsg(`رُحّل رصيد ${k} موظفًا إلى ${y + 1}`); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<><div className="card"><h2>ترحيل الإجازات إلى {y + 1}</h2><div className="row"><Field l="الحد الأقصى للترحيل (أيام)"><input type="number" value={cap} onChange={(e) => setCap(+e.target.value)} /></Field><button className="btn" onClick={carry}>ترحيل أرصدة الجميع</button></div>{msg && <div className="ok">{msg}</div>}<div className="mut">يُرحَّل الرصيد الموجب مقيَّدًا بالحد الأقصى، مرة واحدة لكل موظف.</div></div>
    <Tbl head={["الموظف", `رصيد ${y}`, "الترحيل المقترح", `مرحَّل إلى ${y + 1}`]} rows={rows.map((r) => [emp(r.e.id), n(r.b), r.b > 0 ? Math.min(Math.floor(r.b), cap) : 0, has(r.e.id) ? <span key="x" className="ok">✓</span> : "—"])} /></>);
}

export function RepExcuse() {
  const { d, emp } = useData(); const [ym, setYm] = useState(today().slice(0, 7));
  const rows = activeEmps(d).map((e) => { const rq = (d.requests || []).filter((r) => r.employee_id === e.id && r.status === "معتمد" && String(r.req_date || "").startsWith(ym)); const lv = (d.leaves || []).filter((l) => l.employee_id === e.id && l.status === "معتمدة" && l.from_date <= ym + "-31" && l.to_date >= ym + "-01").reduce((s, l) => s + l.days, 0);
    return [emp(e.id), rq.filter((r) => r.kind === "استئذان").reduce((s, r) => s + (+r.hours || 0), 0), rq.filter((r) => r.kind === "طلب عذر").length, lv]; });
  return (<><div className="card"><Field l="الشهر"><input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></Field></div><Tbl head={["الموظف", "ساعات الاستئذان", "أيام العذر", "أيام الإجازة"]} rows={rows} /></>);
}

export function RepSelfie() {
  const { d, emp } = useData(); const [ym, setYm] = useState(today().slice(0, 7)), [rows, setRows] = useState<Row[]>([]), [err, setErr] = useState("");
  useEffect(() => { sb.from(T("attendance")).select("*").not("selfie_path", "is", null).gte("day", ym + "-01").lte("day", ym + "-31").then(({ data, error }) => { if (error) setErr(error.message); else setRows(data || []); }); }, [ym]);
  async function open(p: string) { const { data, error } = await sb.storage.from("awtad-docs").createSignedUrl(p, 60); if (error || !data) return alert(error?.message || "تعذّر الفتح"); window.open(data.signedUrl, "_blank"); }
  void d;
  return (<><div className="card"><h2>تقرير السيلفي</h2><Field l="الشهر"><input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></Field>{err && <div className="er">{err}</div>}<div className="mut">صور التسجيل التي التقطها الموظفون عند الحضور من المتصفح.</div></div>
    <Tbl head={["الموظف", "اليوم", "الدخول", "الصورة"]} rows={rows.map((r) => [emp(r.employee_id), r.day, String(r.check_in || "").slice(0, 5), <button key={r.id} className="btn sm" onClick={() => open(r.selfie_path)}>عرض الصورة</button>])} empty="لا توجد صور سيلفي في هذا الشهر" /></>);
}

// مركز التقارير: بلاطات بنجمة مفضلة
const TILES: [string, string][] = [["لوحة التحكم", "dashboard"], ["خريطة الحضور", "rep-map"], ["ملخص اليوم", "rep-today"], ["تحليلات المواقع", "rep-locations"], ["السجل الشهري", "attendance-report"], ["بحث متعدد", "rep-search"], ["الزيارات اليومية", "rep-visits"], ["صلاحية الوثائق", "rep-docs"], ["إجازات الموظف", "rep-empleaves"], ["الإجازات الشهرية", "rep-monthleaves"], ["تداخل الإجازات", "rep-overlap"], ["تاريخ العودة", "rep-return"], ["مستحقات الإجازة", "rep-entitle"], ["رصيد الإجازات", "rep-balance"], ["استثناء من مستحقات الإجازة", "rep-exempt"], ["ترحيل الإجازات", "rep-carry"], ["إجمالي ساعات العذر والإجازة", "rep-excuse"], ["تقرير السيلفي", "rep-selfie"]];
export function Reports() {
  const [fav, setFav] = useState<string[]>([]);
  useEffect(() => { try { setFav(JSON.parse(localStorage.getItem("awtad_fav") || "[]")); } catch {} }, []);
  const toggle = (k: string) => { const f = fav.includes(k) ? fav.filter((x) => x !== k) : [...fav, k]; setFav(f); try { localStorage.setItem("awtad_fav", JSON.stringify(f)); } catch {} };
  const sorted = [...TILES].sort((a, b) => Number(fav.includes(b[1])) - Number(fav.includes(a[1])));
  return (<>
    <div className="banner"><div className="bicon"><Ic n="chart" s={44} /></div><div><h1>لوحة التحكم</h1><div className="mut">ستحصل على مجموعة كبيرة من التقارير والتحليلات الذكية لتساعدك في اتخاذ القرارات</div></div>
      <Link href="/dashboard" className="btn soft">الصفحة الرئيسية</Link></div>
    <div className="tiles">{sorted.map(([t, k]) => (
      <div className="tile" key={k}><button className={"star" + (fav.includes(k) ? " on" : "")} onClick={() => toggle(k)} aria-label="مفضلة"><Ic n="star" s={20} /></button>
        <Link href={"/" + k}>{t}</Link><span className="arrow"><Ic n="chev" s={14} /></span></div>))}</div></>);
}
