// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useEffect, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { sb } from "@/awtad/lib/supabase";
import { Row, addDays, gross, today } from "@/awtad/lib/calc";
import { ExportBar } from "./ExportBar";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
type Spec = { title?: string; dataset: string; columns?: string[]; filters?: { c: string; op: string; v: string }[]; sort?: string | null; desc?: boolean; group_by?: string | null; metric?: string | null; metric_col?: string | null; limit?: number; summary?: string };

// مجموعات البيانات وأعمدتها المتاحة للتقارير (تُرسَل أسماء الأعمدة فقط إلى الذكاء الاصطناعي، لا بيانات)
export const SCHEMA: Record<string, string[]> = {
  employees: ["name", "dept", "job", "nationality", "gender", "marital_status", "basic", "house", "trans", "other", "gross", "join_date", "iqama_expiry", "contract_end", "probation_end", "passport_expiry", "work_permit_expiry", "health_insurance_expiry", "pay_group", "active"],
  leaves: ["employee", "dept", "type", "from_date", "to_date", "days", "status"],
  attendance: ["employee", "dept", "day", "check_in", "check_out", "in_range", "excused"],
  requests: ["employee", "dept", "kind", "req_date", "hours", "status", "reason"],
  expenses: ["employee", "dept", "category", "amount", "expense_date", "status", "flagged"],
  loans: ["employee", "amount", "installment", "start_month", "status"],
  trips: ["employee", "destination", "from_date", "to_date", "daily_allowance", "status"],
  candidates: ["name", "job", "stage", "score", "email"],
  assets: ["employee", "name", "serial", "issued_on", "returned_on", "status"],
  documents: ["employee", "title", "kind", "expires_on"],
  trainings: ["employee", "course", "status"],
  fees: ["employee", "kind", "amount", "vat", "paid_on"],
  company_docs: ["kind", "title", "number", "issuer", "expiry_date"],
  acct_trial: ["code", "name", "type", "debit", "credit", "balance"],
  acct_journals: ["entry_no", "entry_date", "description", "source", "amount"],
};
const LABEL: Record<string, string> = { employees: "الموظفون", leaves: "الإجازات", attendance: "الحضور", requests: "الطلبات", expenses: "المصروفات", loans: "السلف", trips: "رحلات العمل", candidates: "المرشحون", assets: "الأصول", documents: "مستندات الموظفين", trainings: "التدريب", fees: "الرسوم الحكومية", company_docs: "مستندات الشركة", acct_trial: "ميزان المراجعة", acct_journals: "القيود اليومية" };

// جاهزة بلا ذكاء اصطناعي
const PRESETS: Record<string, { t: string; spec: Spec }[]> = {
  "الموارد البشرية": [
    { t: "الموظفون حسب القسم", spec: { title: "الموظفون حسب القسم", dataset: "employees", group_by: "dept", metric: "count" } },
    { t: "الموظفون حسب الجنسية", spec: { title: "الموظفون حسب الجنسية", dataset: "employees", group_by: "nationality", metric: "count" } },
    { t: "رواتب الموظفين الفعّالين", spec: { title: "رواتب الموظفين", dataset: "employees", columns: ["name", "dept", "job", "basic", "house", "trans", "other", "gross"], filters: [{ c: "active", op: "=", v: "true" }], sort: "gross", desc: true } },
    { t: "إقامات تنتهي خلال 60 يومًا", spec: { title: "إقامات تنتهي خلال 60 يومًا", dataset: "employees", columns: ["name", "dept", "nationality", "iqama_expiry"], filters: [{ c: "iqama_expiry", op: "<", v: "@+60" }], sort: "iqama_expiry" } },
    { t: "عقود تنتهي خلال 90 يومًا", spec: { title: "عقود تنتهي خلال 90 يومًا", dataset: "employees", columns: ["name", "dept", "contract_end"], filters: [{ c: "contract_end", op: "<", v: "@+90" }], sort: "contract_end" } }],
  "الحضور والإجازات": [
    { t: "الإجازات المعلّقة", spec: { title: "الإجازات بانتظار الموافقة", dataset: "leaves", filters: [{ c: "status", op: "يحتوي", v: "بانتظار" }] } },
    { t: "الإجازات حسب النوع", spec: { title: "الإجازات المعتمدة حسب النوع", dataset: "leaves", filters: [{ c: "status", op: "=", v: "معتمدة" }], group_by: "type", metric: "sum", metric_col: "days" } },
    { t: "تأخر الحضور اليوم", spec: { title: "حضور اليوم", dataset: "attendance", filters: [{ c: "day", op: "=", v: "@0" }], sort: "check_in", desc: true } }],
  "الرواتب والمصروفات": [
    { t: "المصروفات حسب الفئة", spec: { title: "المصروفات المعتمدة حسب الفئة", dataset: "expenses", filters: [{ c: "status", op: "=", v: "معتمد" }], group_by: "category", metric: "sum", metric_col: "amount" } },
    { t: "المصروفات الموسومة بتجاوز السياسة", spec: { title: "مصروفات خارج السياسة", dataset: "expenses", filters: [{ c: "flagged", op: "يحتوي", v: "ي" }] } },
    { t: "السلف المعتمدة", spec: { title: "السلف المعتمدة", dataset: "loans", filters: [{ c: "status", op: "=", v: "معتمد" }] } }],
  "الشركة والرسوم": [
    { t: "مستندات الشركة حسب الانتهاء", spec: { title: "مستندات الشركة", dataset: "company_docs", sort: "expiry_date" } },
    { t: "الرسوم الحكومية حسب النوع", spec: { title: "الرسوم الحكومية حسب النوع", dataset: "fees", group_by: "kind", metric: "sum", metric_col: "amount" } }],
  "المحاسبة": [
    { t: "ميزان المراجعة", spec: { title: "ميزان المراجعة حتى اليوم", dataset: "acct_trial", columns: ["code", "name", "type", "debit", "credit", "balance"] } },
    { t: "القيود حسب المصدر", spec: { title: "القيود حسب المصدر", dataset: "acct_journals", group_by: "source", metric: "sum", metric_col: "amount" } }],
};

// تحويل الطلب إلى مواصفة بلا ذكاء اصطناعي (كلمات مفتاحية)
function localSpec(q: string, d: Record<string, Row[]>): Spec {
  const has = (...w: string[]) => w.some((x) => q.includes(x));
  const ds = has("ميزان") ? "acct_trial" : has("قيد", "قيود") ? "acct_journals" : has("رسوم") ? "fees" : has("مستندات الشركة", "السجل التجاري") ? "company_docs" : has("إجازة", "إجازات") ? "leaves" : has("حضور", "تأخر", "غياب") ? "attendance" : has("مصروف", "مصاريف") ? "expenses" : has("سلف") ? "loans" : has("رحل") ? "trips" : has("مرشح", "توظيف") ? "candidates" : has("أصول", "عهد") ? "assets" : has("تدريب") ? "trainings" : has("طلب", "طلبات") ? "requests" : has("وثائق", "مستندات") ? "documents" : "employees";
  const filters: Spec["filters"] = [];
  const depts = Array.from(new Set((d.employees || []).map((e) => e.dept).filter(Boolean)));
  const dept = depts.find((x) => q.includes(x)); if (dept && SCHEMA[ds].includes("dept")) filters.push({ c: "dept", op: "=", v: dept });
  if (has("معلق", "بانتظار")) filters.push({ c: "status", op: "يحتوي", v: "بانتظار" }); else if (has("معتمد")) filters.push({ c: "status", op: "يحتوي", v: "معتمد" }); else if (has("مرفوض")) filters.push({ c: "status", op: "يحتوي", v: "مرفوض" });
  if (ds === "employees" && has("إقامة", "الإقامات")) filters.push({ c: "iqama_expiry", op: "<", v: "@+60" });
  if (ds === "employees" && has("عقد", "العقود")) filters.push({ c: "contract_end", op: "<", v: "@+90" });
  let group_by: string | null = null; const g: [string, string[]][] = [["القسم", ["dept"]], ["الجنسية", ["nationality"]], ["النوع", ["type", "kind", "category"]], ["الفئة", ["category"]], ["المصدر", ["source"]], ["الحالة", ["status"]]];
  if (has("حسب")) for (const [w, cols] of g) if (q.includes("حسب " + w) || q.includes("حسب ال" + w)) group_by = cols.find((c) => SCHEMA[ds].includes(c)) || null;
  const numeric = ["amount", "days", "hours", "debit", "credit", "gross", "basic"].find((c) => SCHEMA[ds].includes(c));
  return { title: q.slice(0, 60), dataset: ds, filters, group_by, metric: group_by ? (has("إجمالي", "مجموع") && numeric ? "sum" : "count") : null, metric_col: has("إجمالي", "مجموع") ? numeric || null : null, summary: "تقرير مُجهَّز بالتحليل البسيط (أضف مفتاح الذكاء الاصطناعي في الإعدادات لفهم أدق)" };
}

async function loadRows(ds: string, d: Record<string, Row[]>, emp: (id: any) => string): Promise<Row[]> {
  const dept = (id: any) => (d.employees || []).find((e) => e.id === id)?.dept || "";
  if (ds === "acct_trial") { const { data, error } = await sb.rpc("awtad_trial_balance", { p_from: "1900-01-01", p_to: today() }); if (error) throw new Error(error.message); return (data || []).filter((r: Row) => !r.is_group && (+r.debit || +r.credit)).map((r: Row) => ({ ...r, balance: Math.round((["أصول", "مصروفات"].includes(r.type) ? +r.debit - +r.credit : +r.credit - +r.debit) * 100) / 100 })); }
  if (ds === "acct_journals") { const { data, error } = await sb.from("awtad_journals").select("entry_no,entry_date,description,source,awtad_journal_lines(debit)").order("entry_no", { ascending: false }).limit(1000); if (error) throw new Error(error.message); return (data || []).map((j: Row) => ({ ...j, amount: (j.awtad_journal_lines || []).reduce((a: number, l: Row) => a + +l.debit, 0) })); }
  const rows = d[ds === "company_docs" ? "company_docs" : ds] || [];
  return rows.map((r) => ({ ...r, employee: r.employee_id ? emp(r.employee_id) : r.employee, dept: r.employee_id ? dept(r.employee_id) : r.dept, course: r.course_id ? (d.courses || []).find((c) => c.id === r.course_id)?.title : undefined, gross: ds === "employees" ? gross(r) : r.gross, active: ds === "employees" ? String(r.active !== false) : r.active, amount: r.amount ?? r.amount }));
}

function run(rows: Row[], s: Spec) {
  const t = today(), val = (v: string) => (v.startsWith("@") ? addDays(t, +v.slice(1) || 0) : v);
  let r = rows.filter((x) => (s.filters || []).every((f) => { if (!f.c) return true; const a = x[f.c], b = val(String(f.v)), num = a !== "" && a != null && !isNaN(+a) && !isNaN(+b) && String(b).trim() !== "";
    if (f.op === "يحتوي") return String(a ?? "").includes(b); if (f.op === "=") return String(a ?? "") === b; if (f.op === "≠") return String(a ?? "") !== b;
    if (a == null || a === "") return false; return f.op === ">" ? (num ? +a > +b : String(a) > b) : (num ? +a < +b : String(a) < b); }));
  const cols = SCHEMA[s.dataset] || [];
  if (s.group_by && cols.includes(s.group_by)) {
    const m: Record<string, number[]> = {}; r.forEach((x) => { const k = String(x[s.group_by!] ?? "غير محدد") || "غير محدد"; (m[k] = m[k] || []).push(+x[s.metric_col || ""] || 0); });
    const met = s.metric || "count", lbl = met === "count" ? "العدد" : (met === "sum" ? "المجموع" : "المتوسط") + (s.metric_col ? ` (${s.metric_col})` : "");
    let out = Object.entries(m).map(([k, a]) => [k, met === "count" ? a.length : met === "sum" ? a.reduce((x, y) => x + y, 0) : a.reduce((x, y) => x + y, 0) / a.length] as [string, number]).sort((a, b) => b[1] - a[1]);
    if (s.limit) out = out.slice(0, s.limit);
    return { head: [s.group_by, lbl], rows: out.map(([k, v]) => [k, Math.round(v * 100) / 100]) as (string | number)[][], chart: out };
  }
  if (s.sort && cols.includes(s.sort)) r = [...r].sort((a, b) => String(a[s.sort!] ?? "").localeCompare(String(b[s.sort!] ?? ""), "ar", { numeric: true }) * (s.desc ? -1 : 1));
  const use = (s.columns || []).filter((c) => cols.includes(c)); const head = use.length ? use : cols.slice(0, 8);
  return { head, rows: r.slice(0, s.limit || 500).map((x) => head.map((c) => (x[c] == null ? "" : typeof x[c] === "number" ? Math.round(x[c] * 100) / 100 : String(x[c])))) as (string | number)[][], chart: null as null | [string, number][] };
}

export function AIReports() {
  const { d, emp } = useData();
  const [q, setQ] = useState(""), [area, setArea] = useState(Object.keys(PRESETS)[0]), [pre, setPre] = useState(0), [busy, setBusy] = useState(false), [msg, setMsg] = useState(""), [res, setRes] = useState<{ title: string; summary?: string; head: string[]; rows: (string | number)[][]; chart: [string, number][] | null; mode: string } | null>(null);
  async function exec(spec: Spec, mode: string) {
    try { const rows = await loadRows(spec.dataset, d, emp); const o = run(rows, spec); setRes({ title: spec.title || LABEL[spec.dataset], summary: spec.summary, ...o, mode }); setMsg(""); } catch (e: any) { setMsg(e.message); }
  }
  async function ask(text: string) {
    if (!text.trim()) return; setBusy(true); setMsg(""); setRes(null);
    const { data, error } = await sb.functions.invoke("awtad-integrations", { body: { action: "ai_report", prompt: text, schema: SCHEMA } });
    let spec: Spec | null = data?.spec && SCHEMA[data.spec.dataset] ? data.spec : null, mode = "الذكاء الاصطناعي";
    if (!spec) { let reason = ""; try { reason = (await (error as any)?.context?.json())?.error || ""; } catch {} spec = localSpec(text, d); mode = "التحليل البسيط" + (reason ? ` — ${reason}` : ""); }
    await exec(spec, mode); setBusy(false);
  }
  useEffect(() => { const p = new URLSearchParams(window.location.search).get("q"); if (p) { setQ(p); ask(p); } }, []); // eslint-disable-line
  const presets = PRESETS[area] || [];
  return (<>
    <div className="card"><h2>✨ التقارير الذكية</h2><div className="mut">اكتب ما تريد بلغتك، مثل: «الإجازات المعلّقة في قسم المبيعات» أو «إجمالي المصروفات حسب الفئة» أو «ميزان المراجعة»، أو اختر من القوائم الجاهزة.</div>
      <div className="row" style={{ marginTop: 10 }}><label className="fld" style={{ flex: 1, minWidth: 260 }}><span>اطلب تقريرك</span><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask(q)} placeholder="ما التقرير المطلوب؟" /></label><button className="btn" onClick={() => ask(q)} disabled={busy}>{busy ? "جارٍ الإعداد..." : "إصدار التقرير"}</button></div>
      <div className="row" style={{ marginTop: 12 }}><Field l="المجال"><select value={area} onChange={(e) => { setArea(e.target.value); setPre(0); }}>{Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field l="نوع التقرير"><select value={pre} onChange={(e) => setPre(+e.target.value)}>{presets.map((p, i) => <option key={p.t} value={i}>{p.t}</option>)}</select></Field>
        <button className="btn soft" onClick={() => exec(presets[pre].spec, "تقرير جاهز")}>تشغيل</button></div></div>
    {msg && <div className="card er">{msg}</div>}
    {res && <><div className="card"><h2>{res.title}</h2>{res.summary && <div className="mut">{res.summary}</div>}<div className="mut">المصدر: {res.mode} — {res.rows.length} صفًا</div></div>
      {res.chart && <div className="card"><h2>الرسم</h2>{res.chart.slice(0, 12).map(([k, v]) => <div className="hbar" key={k}><span>{k}</span><div className="track"><div style={{ width: `${(v / Math.max(...res.chart!.map((x) => x[1]), 1)) * 100}%` }} /></div><b>{Math.round(v * 100) / 100}</b></div>)}</div>}
      <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar title={res.title} head={res.head} rows={res.rows} /></div><table><thead><tr>{res.head.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{res.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}{!res.rows.length && <tr><td colSpan={res.head.length} className="mut">لا توجد نتائج</td></tr>}</tbody></table></div></>}</>);
}
