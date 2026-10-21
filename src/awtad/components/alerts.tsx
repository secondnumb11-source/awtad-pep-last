// @ts-nocheck -- ported from original project (looser TS settings)
import { Link } from "@/awtad/nav";
import { useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { Row, addDays, today } from "@/awtad/lib/calc";
import { sendMail } from "@/awtad/lib/mail";
import { ExportBar } from "./ExportBar";

export type Alert = { sev: 0 | 1 | 2 | 3; cat: string; title: string; detail: string; date?: string; days?: number; href: string };
export const SEV = ["قادم", "قريب", "عاجل", "منتهٍ / متأخر"], SEVC = ["", "wa", "er", "er"];
const sevOf = (days: number): 0 | 1 | 2 | 3 => (days < 0 ? 3 : days <= 7 ? 2 : days <= 30 ? 1 : 0);
const diff = (a: string, b: string) => Math.round((+new Date(a) - +new Date(b)) / 864e5);

// ===== محرك التنبيهات: كل المدد والمهل والمواعيد والخطوات الناقصة =====
export function computeAlerts(d: Record<string, Row[]>, t = today()): Alert[] {
  const out: Alert[] = [], emps = (d.employees || []).filter((e) => e.active !== false);
  const date = (cat: string, title: string, dt: string | null | undefined, win: number, href: string, detail = "") => { if (!dt) return; const days = diff(dt, t); if (days <= win) out.push({ sev: sevOf(days), cat, title, detail: detail || (days < 0 ? `انتهى منذ ${-days} يومًا` : days === 0 ? "ينتهي اليوم" : `بعد ${days} يومًا`), date: dt, days, href }); };
  emps.forEach((e) => {
    date("إقامات", `إقامة ${e.name}`, e.iqama_expiry, 60, "/employees"); date("عقود", `عقد ${e.name}`, e.contract_end, 60, "/requests");
    date("فترة التجربة", `انتهاء تجربة ${e.name}`, e.probation_end && e.probation_end >= t ? e.probation_end : null, 30, "/employees");
    date("جوازات", `جواز ${e.name}`, e.passport_expiry, 90, "/employees"); date("رخص العمل", `رخصة عمل ${e.name}`, e.work_permit_expiry, 60, "/employees"); date("التأمين الطبي", `تأمين طبي ${e.name}`, e.health_insurance_expiry, 60, "/fees");
  });
  (d.documents || []).filter((x) => x.expires_on).forEach((x) => date("مستندات الموظفين", `${x.title} — ${emps.find((e) => e.id === x.employee_id)?.name || ""}`, x.expires_on, 60, "/documents"));
  (d.company_docs || []).forEach((x) => date("مستندات الشركة", `${x.kind}: ${x.title}`, x.expiry_date, x.notify_days || 60, "/company-docs"));
  // المواعيد والمهل الدورية
  (d.deadlines || []).filter((x) => x.active).forEach((x) => {
    const y = +t.slice(0, 4), m = +t.slice(5, 7), pad = (v: number) => String(v).padStart(2, "0"), last = (yy: number, mm: number) => new Date(yy, mm, 0).getDate();
    let due: string | null = null, key = "";
    if (x.recurrence === "شهري") { key = t.slice(0, 7); due = `${key}-${pad(Math.min(x.day_of_month || 1, last(y, m)))}`; if (x.done_period === key) { const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1; due = `${ny}-${pad(nm)}-${pad(Math.min(x.day_of_month || 1, last(ny, nm)))}`; } }
    else if (x.recurrence === "سنوي") { key = String(y); due = `${y}-${pad(x.month_of_year || 1)}-${pad(Math.min(x.day_of_month || 1, last(y, x.month_of_year || 1)))}`; if (x.done_period === key) due = `${y + 1}-${pad(x.month_of_year || 1)}-${pad(Math.min(x.day_of_month || 1, last(y + 1, x.month_of_year || 1)))}`; }
    else { due = x.done_period === "done" ? null : x.due_date; }
    if (due) { const days = diff(due, t); if (days <= (x.notify_days || 7)) out.push({ sev: sevOf(days), cat: "مواعيد ومهل", title: x.title, detail: (days < 0 ? `متأخر ${-days} يومًا` : days === 0 ? "اليوم" : `بعد ${days} يومًا`) + (x.category ? ` — ${x.category}` : ""), date: due, days, href: "/deadlines" }); }
  });
  // بيانات ناقصة لكل موظف
  emps.forEach((e) => { const miss = ([["رقم الهوية/الإقامة", e.national_id], ["الآيبان", e.iban], ["البريد", e.email], ["الجوال", e.phone], ["تاريخ الميلاد", e.birth_date], ["رقم عقد قوى", e.qiwa_contract_no], ["رقم التأمينات", e.gosi_no]] as [string, any][]).filter(([, v]) => !v).map(([k]) => k);
    if (miss.length) out.push({ sev: 1, cat: "بيانات ناقصة", title: `بيانات ناقصة: ${e.name}`, detail: miss.join("، "), href: "/employees" }); });
  // خطوات التعيين
  (d.contracts || []).filter((c) => c.status === "أُرسل" && diff(t, String(c.created_at).slice(0, 10)) >= 3).forEach((c) => out.push({ sev: 1, cat: "خطوات التعيين", title: `عقد بانتظار توقيع ${emps.find((e) => e.id === c.employee_id)?.name || ""}`, detail: `أُرسل منذ ${diff(t, String(c.created_at).slice(0, 10))} يومًا`, href: "/contracts" }));
  emps.filter((e) => e.join_date && diff(t, e.join_date) <= 60 && diff(t, e.join_date) >= 0 && !(d.contracts || []).some((c) => c.employee_id === e.id)).forEach((e) => out.push({ sev: 1, cat: "خطوات التعيين", title: `لا يوجد عقد للموظف الجديد ${e.name}`, detail: `باشر منذ ${diff(t, e.join_date)} يومًا`, href: "/contracts" }));
  (d.onboarding_tasks || []).filter((x) => !x.done && x.due).forEach((x) => { const days = diff(x.due, t); if (days <= 3) out.push({ sev: sevOf(days) < 2 ? 2 : sevOf(days), cat: "خطوات التعيين", title: `${x.title} — ${emps.find((e) => e.id === x.employee_id)?.name || ""}`, detail: days < 0 ? `متأخرة ${-days} يومًا` : "موعدها قريب", date: x.due, days, href: "/onboarding" }); });
  const req = (d.lists || []).filter((l) => l.kind === "مستند مطلوب").map((l) => l.name);
  if (req.length) emps.filter((e) => e.preboarding || (e.join_date && diff(t, e.join_date) <= 90)).forEach((e) => { const have = (d.documents || []).filter((x) => x.employee_id === e.id), miss = req.filter((r) => !have.some((x) => String(x.kind).includes(r) || String(x.title).includes(r))); if (miss.length) out.push({ sev: 1, cat: "خطوات التعيين", title: `مستندات مطلوبة ناقصة: ${e.name}`, detail: miss.join("، "), href: "/documents" }); });
  const stale = [...(d.requests || []), ...(d.leaves || [])].filter((r) => String(r.status).startsWith("بانتظار") && diff(t, String(r.created_at).slice(0, 10)) >= 2).length;
  if (stale) out.push({ sev: 1, cat: "طلبات", title: `${stale} طلبًا معلّقًا منذ أكثر من يومين`, detail: "بانتظار الموافقة", href: "/requests" });
  return out.sort((a, b) => b.sev - a.sev || (a.days ?? 999) - (b.days ?? 999));
}

export function AlertsCenter() {
  const { d } = useData(); const { user } = useAuth();
  const all = computeAlerts(d), cats = Array.from(new Set(all.map((a) => a.cat)));
  const [cat, setCat] = useState(""), [sev, setSev] = useState(""), [msg, setMsg] = useState("");
  const list = all.filter((a) => (!cat || a.cat === cat) && (sev === "" || a.sev >= +sev));
  async function mail() { const m = await sendMail(user!.email, `ملخص التنبيهات — ${today()}`, `<h3>ملخص التنبيهات</h3><ul>${list.slice(0, 40).map((a) => `<li>[${SEV[a.sev]}] ${a.title} — ${a.detail}</li>`).join("")}</ul>`); setMsg(m.ok ? "أُرسل الملخص إلى بريدك" : m.msg || "فشل الإرسال (تحقق من إعدادات Resend)"); }
  return (<>
    <div className="grid">{SEV.map((s, i) => <div className="card kpi" key={s}><div className="num">{all.filter((a) => a.sev === i).length}</div><div className="mut">{s}</div></div>)}</div>
    <div className="card"><div className="row"><label className="fld"><span>التصنيف</span><select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">الكل ({all.length})</option>{cats.map((c) => <option key={c} value={c}>{c} ({all.filter((a) => a.cat === c).length})</option>)}</select></label>
      <label className="fld"><span>الأهمية</span><select value={sev} onChange={(e) => setSev(e.target.value)}><option value="">الكل</option><option value="1">قريب فأعلى</option><option value="2">عاجل فأعلى</option><option value="3">منتهٍ / متأخر فقط</option></select></label>
      <button className="btn soft" onClick={mail}>إرسال الملخص إلى بريدي</button></div>{msg && <div className="ok">{msg}</div>}</div>
    <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar title="التنبيهات والتذكيرات" head={["الأهمية", "التصنيف", "التنبيه", "التفاصيل", "التاريخ"]} rows={list.map((a) => [SEV[a.sev], a.cat, a.title, a.detail, a.date || ""])} /></div>
      <table><thead><tr><th>الأهمية</th><th>التصنيف</th><th>التنبيه</th><th>التفاصيل</th><th>التاريخ</th><th /></tr></thead><tbody>
        {list.map((a, i) => <tr key={i}><td className={SEVC[a.sev]}><b>{SEV[a.sev]}</b></td><td>{a.cat}</td><td>{a.title}</td><td>{a.detail}</td><td>{a.date || ""}</td><td><Link className="btn sm" href={a.href}>فتح</Link></td></tr>)}
        {!list.length && <tr><td colSpan={6} className="ok">لا توجد تنبيهات حاليًا ✓</td></tr>}</tbody></table></div></>);
}
void addDays;
