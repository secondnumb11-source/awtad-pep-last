// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { sb, T, getOrg } from "@/awtad/lib/supabase";
import { Row, n, today } from "@/awtad/lib/calc";
import { ExportBar } from "./ExportBar";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
const TYPES = ["أصول", "التزامات", "حقوق ملكية", "إيرادات", "مصروفات"];
const debitNature = (t: string) => t === "أصول" || t === "مصروفات";
const bal = (r: Row) => (debitNature(r.type) ? +r.debit - +r.credit : +r.credit - +r.debit);
const yearStart = () => today().slice(0, 4) + "-01-01";

// ===== تحميل شجرة الحسابات =====
function useAcct() {
  const [accounts, setAccounts] = useState<Row[]>([]), [loading, setLoading] = useState(true), [err, setErr] = useState("");
  const load = useCallback(async () => {
    const { data, error } = await sb.from(T("acct_accounts")).select("*").order("code");
    if (error) setErr(error.message); else { setErr(""); setAccounts(data || []); } setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { accounts, loading, err, load, leaves: accounts.filter((a) => !a.is_group && a.active) };
}
function Setup({ ac }: { ac: ReturnType<typeof useAcct> }) {
  const [msg, setMsg] = useState("");
  if (ac.loading || ac.accounts.length) return ac.err ? <div className="card er">{ac.err}</div> : null;
  async function seed() { const { data, error } = await sb.rpc("awtad_seed_chart"); setMsg(error ? error.message : `أُنشئ ${data} حسابًا وربط الأحداث التلقائية`); await ac.load(); }
  return <div className="card"><h2>تهيئة المحاسبة</h2><div className="mut">لم تُنشأ شجرة الحسابات بعد. التهيئة القياسية تنشئ حسابات مناسبة للمنشآت السعودية (أصول، التزامات، حقوق ملكية، إيرادات، مصروفات) وتربط الأحداث تلقائيًا: المصروفات المعتمدة، العهد، السلف، رحلات العمل، رسوم الإقامات وغيرها، ويمكنك تعديلها بعد ذلك.</div><p><button className="btn" onClick={seed}>إنشاء شجرة الحسابات القياسية</button></p>{msg && <div className="ok">{msg}</div>}</div>;
}
const Tbl = ({ head, rows, title, totals }: { head: string[]; rows: (string | number)[][]; title?: string; totals?: (string | number)[] }) => (
  <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar title={title} head={head} rows={rows} totals={totals} /></div><table><thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}{!rows.length && <tr><td colSpan={head.length} className="mut">لا توجد بيانات</td></tr>}</tbody>
    {totals && <tfoot><tr>{totals.map((c, j) => <th key={j}>{c}</th>)}</tr></tfoot>}</table></div>
);

// ===== شجرة الحسابات =====
export function ChartOfAccounts() {
  const ac = useAcct();
  const [f, setF] = useState<Row>({ type: "أصول", is_group: false }), [msg, setMsg] = useState("");
  const kids = (id: any) => ac.accounts.filter((a) => (a.parent_id || null) === id);
  const rows: Row[] = []; const walk = (pid: any, d: number) => kids(pid).forEach((a) => { rows.push({ ...a, _d: d }); walk(a.id, d + 1); }); walk(null, 0);
  async function add() {
    if (!f.code || !f.name) return setMsg("الرمز والاسم مطلوبان");
    const { error } = await sb.from(T("acct_accounts")).insert({ org_id: getOrg(), code: String(f.code).trim(), name: String(f.name).trim(), type: f.type, parent_id: f.parent_id ? +f.parent_id : null, is_group: !!f.is_group });
    if (error) setMsg(error.message.includes("duplicate") ? "هذا الرمز مستخدم" : error.message); else { setMsg(""); setF({ type: "أصول", is_group: false }); await ac.load(); }
  }
  async function toggle(a: Row) { const { error } = await sb.from(T("acct_accounts")).update({ active: !a.active }).eq("id", a.id); if (error) setMsg(error.message); await ac.load(); }
  async function del(a: Row) { if (!confirm(`حذف الحساب ${a.code}؟`)) return; const { error } = await sb.from(T("acct_accounts")).delete().eq("id", a.id); setMsg(error ? "لا يمكن حذف حساب له قيود أو حسابات فرعية. عطّله بدل الحذف" : ""); await ac.load(); }
  return (<><Setup ac={ac} />
    <div className="card"><h2>إضافة حساب</h2>{msg && <div className="er">{msg}</div>}<div className="fgrid">
      <Field l="الرمز *"><input value={f.code || ""} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field><Field l="اسم الحساب *"><input value={f.name || ""} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field l="النوع"><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
      <Field l="الحساب الأب"><select value={f.parent_id || ""} onChange={(e) => setF({ ...f, parent_id: e.target.value })}><option value="">— (حساب رئيسي)</option>{ac.accounts.filter((a) => a.is_group).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></Field>
      <label className="chk"><input type="checkbox" checked={!!f.is_group} onChange={(e) => setF({ ...f, is_group: e.target.checked })} />حساب رئيسي (تجميعي، لا تُسجَّل عليه قيود)</label></div>
      <div className="actions"><button className="btn" onClick={add}>حفظ ✓</button></div></div>
    <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar title="شجرة الحسابات" head={["الرمز", "الاسم", "النوع", "التصنيف", "الحالة"]} rows={rows.map((a) => [a.code, a.name, a.type, a.is_group ? "رئيسي" : "تفصيلي", a.active ? "نشط" : "معطّل"])} /></div>
      <table><thead><tr><th>الرمز</th><th>الاسم</th><th>النوع</th><th>التصنيف</th><th /></tr></thead><tbody>
        {rows.map((a) => <tr key={a.id} style={{ opacity: a.active ? 1 : 0.5 }}><td>{a.code}</td><td style={{ paddingInlineStart: 12 + a._d * 22, fontWeight: a.is_group ? 700 : 400 }}>{a.name}</td><td>{a.type}</td><td>{a.is_group ? "رئيسي" : "تفصيلي"}</td>
          <td><button className="btn sm" onClick={() => toggle(a)}>{a.active ? "تعطيل" : "تفعيل"}</button><button className="btn sm dng" onClick={() => del(a)}>حذف</button></td></tr>)}</tbody></table></div></>);
}

// ===== القيود اليومية =====
export function Journals() {
  const ac = useAcct(); const { reload } = useData();
  const [from, setFrom] = useState(today().slice(0, 4) + "-01-01"), [to, setTo] = useState(today()), [src, setSrc] = useState(""), [q, setQ] = useState(""), [rows, setRows] = useState<Row[]>([]), [open, setOpen] = useState<number | null>(null), [msg, setMsg] = useState("");
  const acc = useMemo(() => Object.fromEntries(ac.accounts.map((a) => [a.id, a])), [ac.accounts]);
  const load = useCallback(async () => {
    const { data, error } = await sb.from(T("journals")).select("*, awtad_journal_lines(account_id,debit,credit,memo,dept)").gte("entry_date", from).lte("entry_date", to).order("entry_no", { ascending: false }).limit(500);
    if (error) setMsg(error.message); else setRows(data || []);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);
  const list = rows.filter((j) => (!src || j.source === src) && (!q || String(j.description || "").includes(q) || String(j.entry_no) === q));
  const total = (j: Row) => (j.awtad_journal_lines || []).reduce((a: number, l: Row) => a + +l.debit, 0);
  async function rev(j: Row) { if (!confirm(`عكس القيد رقم ${j.entry_no}؟`)) return; const { error } = await sb.rpc("awtad_reverse_journal", { p_id: j.id }); setMsg(error ? error.message : "أُنشئ القيد العكسي"); await load(); void reload; }
  const sources = Array.from(new Set(rows.map((r) => r.source)));
  return (<><Setup ac={ac} />
    <div className="card"><h2>القيود اليومية</h2><div className="row"><Field l="من"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field l="إلى"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <Field l="المصدر"><select value={src} onChange={(e) => setSrc(e.target.value)}><option value="">الكل</option>{sources.map((s) => <option key={s}>{s}</option>)}</select></Field><Field l="بحث بالبيان أو الرقم"><input value={q} onChange={(e) => setQ(e.target.value)} /></Field></div>{msg && <div className="ok">{msg}</div>}</div>
    <div className="card scroll"><div style={{ textAlign: "end" }}><ExportBar title="القيود اليومية" head={["الرقم", "التاريخ", "البيان", "المصدر", "المبلغ"]} rows={list.map((j) => [j.entry_no, j.entry_date, j.description, j.source, total(j)])} /></div>
      <table><thead><tr><th>الرقم</th><th>التاريخ</th><th>البيان</th><th>المصدر</th><th>المبلغ</th><th /></tr></thead><tbody>
        {list.map((j) => (<>
          <tr key={j.id}><td>{j.entry_no}</td><td>{j.entry_date}</td><td>{j.description}{j.reversed_of ? <span className="chip">عكسي</span> : null}</td><td>{j.source}</td><td>{n(total(j))}</td>
            <td><button className="btn sm" onClick={() => setOpen(open === j.id ? null : j.id)}>{open === j.id ? "إخفاء" : "التفاصيل"}</button>{!j.reversed_of && <button className="btn sm dng" onClick={() => rev(j)}>عكس</button>}</td></tr>
          {open === j.id && <tr key={j.id + "d"}><td colSpan={6}><table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>بيان</th><th>القسم</th></tr></thead><tbody>{(j.awtad_journal_lines || []).map((l: Row, i: number) => <tr key={i}><td>{acc[l.account_id]?.code} {acc[l.account_id]?.name}</td><td>{+l.debit ? n(l.debit) : ""}</td><td>{+l.credit ? n(l.credit) : ""}</td><td>{l.memo}</td><td>{l.dept}</td></tr>)}</tbody></table></td></tr>}
        </>))}{!list.length && <tr><td colSpan={6} className="mut">لا توجد قيود</td></tr>}</tbody></table></div></>);
}

// ===== قيد جديد =====
export function JournalForm() {
  const ac = useAcct(); const { d } = useData();
  const blank = () => ({ code: "", debit: "", credit: "", memo: "", dept: "" });
  const [date, setDate] = useState(today()), [desc, setDesc] = useState(""), [lines, setLines] = useState<Row[]>([blank(), blank()]), [msg, setMsg] = useState(""), [ok, setOk] = useState(true);
  const D = lines.reduce((a, l) => a + (+l.debit || 0), 0), C = lines.reduce((a, l) => a + (+l.credit || 0), 0), diff = Math.round((D - C) * 100) / 100;
  const set = (i: number, k: string, v: string) => setLines(lines.map((l, j) => (j === i ? { ...l, [k]: v, ...(k === "debit" && v ? { credit: "" } : k === "credit" && v ? { debit: "" } : {}) } : l)));
  const depts = Array.from(new Set((d.employees || []).map((e) => e.dept).filter(Boolean)));
  async function post() {
    const L = lines.filter((l) => l.code && (+l.debit || +l.credit)).map((l) => ({ code: l.code, debit: +l.debit || 0, credit: +l.credit || 0, memo: l.memo || desc, dept: l.dept || null }));
    const { error } = await sb.rpc("awtad_post_journal", { p_date: date, p_desc: desc, p_lines: L });
    setOk(!error); setMsg(error ? error.message : "تم ترحيل القيد"); if (!error) { setDesc(""); setLines([blank(), blank()]); }
  }
  return (<><Setup ac={ac} />
    <div className="card"><h2>قيد يومية جديد</h2><div className="fgrid"><Field l="التاريخ"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field><Field l="البيان *"><input value={desc} onChange={(e) => setDesc(e.target.value)} /></Field></div>
      <table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th><th>بيان السطر</th><th>القسم</th><th /></tr></thead><tbody>
        {lines.map((l, i) => <tr key={i}><td><select value={l.code} onChange={(e) => set(i, "code", e.target.value)}><option value="">اختر حسابًا</option>{ac.leaves.map((a) => <option key={a.id} value={a.code}>{a.code} {a.name}</option>)}</select></td>
          <td><input type="number" min={0} step="0.01" value={l.debit} onChange={(e) => set(i, "debit", e.target.value)} style={{ width: 120 }} /></td><td><input type="number" min={0} step="0.01" value={l.credit} onChange={(e) => set(i, "credit", e.target.value)} style={{ width: 120 }} /></td>
          <td><input value={l.memo} onChange={(e) => set(i, "memo", e.target.value)} /></td><td><input list="dp" value={l.dept} onChange={(e) => set(i, "dept", e.target.value)} style={{ width: 120 }} /></td><td><button className="btn sm dng" onClick={() => setLines(lines.filter((_, j) => j !== i))}>×</button></td></tr>)}</tbody>
        <tfoot><tr><th>الإجمالي</th><th>{n(D)}</th><th>{n(C)}</th><th colSpan={3} className={diff === 0 && D > 0 ? "ok" : "er"}>{diff === 0 && D > 0 ? "القيد متوازن" : `الفرق ${n(Math.abs(diff))}`}</th></tr></tfoot></table>
      <datalist id="dp">{depts.map((x) => <option key={x} value={x} />)}</datalist>
      <div className="actions"><button className="btn soft" onClick={() => setLines([...lines, blank()])}>إضافة سطر</button><button className="btn" onClick={post} disabled={!(diff === 0 && D > 0) || !desc}>ترحيل القيد ✓</button></div>{msg && <div className={ok ? "ok" : "er"}>{msg}</div>}</div></>);
}

// ===== دفتر الأستاذ =====
export function Ledger() {
  const ac = useAcct();
  const [id, setId] = useState(""), [from, setFrom] = useState(yearStart()), [to, setTo] = useState(today()), [rows, setRows] = useState<Row[]>([]), [open, setOpen] = useState(0), [msg, setMsg] = useState("");
  const acct = ac.accounts.find((a) => String(a.id) === (id || String(ac.leaves[0]?.id)));
  useEffect(() => {
    if (!acct) return; let off = false;
    (async () => {
      const prev = new Date(from); prev.setDate(prev.getDate() - 1);
      const [o, l] = await Promise.all([sb.rpc("awtad_trial_balance", { p_from: "1900-01-01", p_to: prev.toISOString().slice(0, 10) }), sb.rpc("awtad_ledger", { p_account: acct.id, p_from: from, p_to: to })]);
      if (off) return; if (o.error || l.error) return setMsg((o.error || l.error)!.message);
      setMsg(""); const r = (o.data || []).find((x: Row) => x.account_id === acct.id); setOpen(r ? bal(r) : 0); setRows(l.data || []);
    })();
    return () => { off = true; };
  }, [acct?.id, from, to]); // eslint-disable-line
  let run = open; const body = rows.map((r) => { run += debitNature(acct?.type) ? +r.debit - +r.credit : +r.credit - +r.debit; return [r.entry_date, r.entry_no, r.description || r.memo || "", r.source, +r.debit ? n(r.debit) : "", +r.credit ? n(r.credit) : "", n(run)] as (string | number)[]; });
  const D = rows.reduce((a, r) => a + +r.debit, 0), C = rows.reduce((a, r) => a + +r.credit, 0);
  return (<><Setup ac={ac} />
    <div className="card"><h2>دفتر الأستاذ</h2><div className="row"><Field l="الحساب"><select value={id || String(ac.leaves[0]?.id ?? "")} onChange={(e) => setId(e.target.value)}>{ac.leaves.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></Field>
      <Field l="من"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field l="إلى"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>{msg && <div className="er">{msg}</div>}
      {acct && <div className="mut" style={{ marginTop: 8 }}>الرصيد الافتتاحي: <b>{n(open)}</b> — طبيعة الحساب {debitNature(acct.type) ? "مدينة" : "دائنة"}</div>}</div>
    <Tbl title={`دفتر الأستاذ — ${acct?.code || ""} ${acct?.name || ""}`} head={["التاريخ", "رقم القيد", "البيان", "المصدر", "مدين", "دائن", "الرصيد"]} rows={body} totals={["", "", "الإجمالي", "", n(D), n(C), n(run)]} /></>);
}

// ===== ميزان المراجعة =====
function rollup(rows: Row[]) {
  const by: Record<string, Row> = {}; rows.forEach((r) => (by[r.account_id] = { ...r, debit: +r.debit, credit: +r.credit }));
  rows.filter((r) => !r.is_group).forEach((r) => { let p = by[r.account_id]?.parent_id; while (p && by[p]) { by[p].debit += +r.debit; by[p].credit += +r.credit; p = by[p].parent_id; } });
  return Object.values(by).sort((a, b) => a.code.localeCompare(b.code));
}
export function TrialBalance() {
  const ac = useAcct();
  const [from, setFrom] = useState(yearStart()), [to, setTo] = useState(today()), [rows, setRows] = useState<Row[]>([]), [groups, setGroups] = useState(false), [msg, setMsg] = useState("");
  useEffect(() => { (async () => { const { data, error } = await sb.rpc("awtad_trial_balance", { p_from: from, p_to: to }); if (error) setMsg(error.message); else { setMsg(""); setRows(data || []); } })(); }, [from, to]);
  const all = groups ? rollup(rows) : rows.filter((r) => !r.is_group), shown = all.filter((r) => +r.debit || +r.credit);
  const D = rows.filter((r) => !r.is_group).reduce((a, r) => a + +r.debit, 0), C = rows.filter((r) => !r.is_group).reduce((a, r) => a + +r.credit, 0);
  return (<><Setup ac={ac} />
    <div className="card"><h2>ميزان المراجعة</h2><div className="row"><Field l="من"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field l="إلى"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      <label className="chk"><input type="checkbox" checked={groups} onChange={(e) => setGroups(e.target.checked)} />إظهار الحسابات الرئيسية بالتجميع</label></div>{msg && <div className="er">{msg}</div>}
      <div className={Math.round(D * 100) === Math.round(C * 100) ? "ok" : "er"}>{Math.round(D * 100) === Math.round(C * 100) ? "الميزان متوازن" : `الميزان غير متوازن: فرق ${n(Math.abs(D - C))}`}</div></div>
    <Tbl title={`ميزان المراجعة ${from} → ${to}`} head={["الرمز", "الحساب", "النوع", "مدين", "دائن", "الرصيد مدين", "الرصيد دائن"]} rows={shown.map((r) => { const b = +r.debit - +r.credit; return [r.code, r.name, r.type, n(r.debit), n(r.credit), b > 0 ? n(b) : "", b < 0 ? n(-b) : ""]; })} totals={["", "الإجمالي", "", n(D), n(C), n(Math.max(0, D - C)), n(Math.max(0, C - D))]} /></>);
}

// ===== قائمة الدخل =====
export function IncomeStatement() {
  const ac = useAcct();
  const [from, setFrom] = useState(yearStart()), [to, setTo] = useState(today()), [rows, setRows] = useState<Row[]>([]), [msg, setMsg] = useState("");
  useEffect(() => { (async () => { const { data, error } = await sb.rpc("awtad_trial_balance", { p_from: from, p_to: to }); if (error) setMsg(error.message); else setRows(data || []); })(); }, [from, to]);
  const rev = rows.filter((r) => !r.is_group && r.type === "إيرادات" && (+r.debit || +r.credit)), exp = rows.filter((r) => !r.is_group && r.type === "مصروفات" && (+r.debit || +r.credit));
  const R = rev.reduce((a, r) => a + bal(r), 0), E = exp.reduce((a, r) => a + bal(r), 0), net = R - E;
  const body: (string | number)[][] = [["الإيرادات", "", ""], ...rev.map((r) => [r.code, r.name, n(bal(r))]), ["", "إجمالي الإيرادات", n(R)], ["المصروفات", "", ""], ...exp.map((r) => [r.code, r.name, n(bal(r))]), ["", "إجمالي المصروفات", n(E)]];
  return (<><Setup ac={ac} /><div className="card"><h2>قائمة الدخل</h2><div className="row"><Field l="من"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field><Field l="إلى"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>{msg && <div className="er">{msg}</div>}</div>
    <Tbl title={`قائمة الدخل ${from} → ${to}`} head={["الرمز", "البند", "المبلغ"]} rows={body} totals={["", net >= 0 ? "صافي الربح" : "صافي الخسارة", n(Math.abs(net))]} /></>);
}

// ===== الميزانية العمومية =====
export function BalanceSheet() {
  const ac = useAcct();
  const [to, setTo] = useState(today()), [rows, setRows] = useState<Row[]>([]), [msg, setMsg] = useState("");
  useEffect(() => { (async () => { const { data, error } = await sb.rpc("awtad_trial_balance", { p_from: "1900-01-01", p_to: to }); if (error) setMsg(error.message); else setRows(data || []); })(); }, [to]);
  const g = (t: string) => rows.filter((r) => !r.is_group && r.type === t && (+r.debit || +r.credit));
  const A = g("أصول"), L = g("التزامات"), Q = g("حقوق ملكية"), sum = (x: Row[]) => x.reduce((a, r) => a + bal(r), 0);
  const profit = sum(g("إيرادات")) - sum(g("مصروفات")), tA = sum(A), tL = sum(L), tQ = sum(Q) + profit;
  const body: (string | number)[][] = [["الأصول", "", ""], ...A.map((r) => [r.code, r.name, n(bal(r))]), ["", "إجمالي الأصول", n(tA)], ["الالتزامات", "", ""], ...L.map((r) => [r.code, r.name, n(bal(r))]), ["", "إجمالي الالتزامات", n(tL)], ["حقوق الملكية", "", ""], ...Q.map((r) => [r.code, r.name, n(bal(r))]), ["", "صافي ربح (خسارة) الفترة غير المقفلة", n(profit)], ["", "إجمالي حقوق الملكية", n(tQ)]];
  const ok = Math.round(tA * 100) === Math.round((tL + tQ) * 100);
  return (<><Setup ac={ac} /><div className="card"><h2>الميزانية العمومية</h2><div className="row"><Field l="كما في"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field></div>{msg && <div className="er">{msg}</div>}
    <div className={ok ? "ok" : "er"}>{ok ? "الميزانية متوازنة: الأصول = الالتزامات + حقوق الملكية" : `غير متوازنة: فرق ${n(Math.abs(tA - tL - tQ))}`}</div></div>
    <Tbl title={`الميزانية العمومية كما في ${to}`} head={["الرمز", "البند", "المبلغ"]} rows={body} totals={["", "الالتزامات + حقوق الملكية", n(tL + tQ)]} /></>);
}

// ===== الرسوم الحكومية والتجديدات (تُرحَّل تلقائيًا) =====
const FEE_KINDS = ["تجديد إقامة", "رخصة عمل", "خروج وعودة", "رسوم قوى", "رسوم مقيم", "رسوم مدد", "بلدية", "تأمين طبي", "أخرى"];
export function Fees() {
  const ac = useAcct(); const { d, reload, emp } = useData();
  const [f, setF] = useState<Row>({ kind: "تجديد إقامة", pay: "1110", date: today(), vat: "" }), [msg, setMsg] = useState(""), [ok, setOk] = useState(true);
  const cash = ac.leaves.filter((a) => a.type === "أصول" && /^11[12]/.test(a.code));
  const exp = f.kind === "تجديد إقامة" || f.kind === "رخصة عمل" || f.kind === "تأمين طبي";
  async function save() {
    if (!(+f.amount > 0)) { setOk(false); return setMsg("المبلغ مطلوب"); }
    const { error } = await sb.rpc("awtad_record_fee", { p_employee: f.emp ? +f.emp : null, p_kind: f.kind, p_amount: +f.amount, p_vat: +f.vat || 0, p_date: f.date, p_pay_code: f.pay, p_new_expiry: f.expiry || null, p_note: f.note || null });
    setOk(!error); setMsg(error ? error.message : "سُجّلت الرسوم وأُنشئ القيد المحاسبي" + (f.expiry && exp && f.emp ? " وحُدّث تاريخ الانتهاء في ملف الموظف" : "")); if (!error) { setF({ ...f, amount: "", vat: "", note: "", expiry: "" }); await reload(); }
  }
  const fees = [...(d.fees || [])].reverse();
  return (<><Setup ac={ac} />
    <div className="card"><h2>تسجيل رسوم أو تجديد</h2><div className="mut" style={{ marginBottom: 8 }}>يُنشئ قيدًا محاسبيًا تلقائيًا (مصروف + ضريبة مدخلات إن وُجدت ← الصندوق/البنك). وعند تجديد الإقامة أو رخصة العمل أو التأمين الطبي يتحدّث تاريخ الانتهاء في ملف الموظف.</div>{msg && <div className={ok ? "ok" : "er"}>{msg}</div>}
      <div className="fgrid"><Field l="الموظف (اختياري)"><select value={f.emp || ""} onChange={(e) => setF({ ...f, emp: e.target.value })}><option value="">— رسوم عامة للمنشأة</option>{(d.employees || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field l="نوع الرسوم"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{FEE_KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <Field l="المبلغ (بدون ضريبة) *"><input type="number" min={0} value={f.amount || ""} onChange={(e) => setF({ ...f, amount: e.target.value, vat: f.vatAuto ? String(Math.round(+e.target.value * 15) / 100) : f.vat })} /></Field>
        <Field l="ضريبة القيمة المضافة"><div className="row"><input type="number" min={0} value={f.vat} onChange={(e) => setF({ ...f, vat: e.target.value, vatAuto: false })} style={{ width: 110 }} /><button className="btn sm" onClick={() => setF({ ...f, vat: String(Math.round((+f.amount || 0) * 15) / 100), vatAuto: true })}>15%</button></div></Field>
        <Field l="تاريخ السداد"><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field l="مدفوع من"><select value={f.pay} onChange={(e) => setF({ ...f, pay: e.target.value })}>{cash.map((a) => <option key={a.id} value={a.code}>{a.code} {a.name}</option>)}</select></Field>
        {exp && f.emp && <Field l="تاريخ الانتهاء الجديد"><input type="date" value={f.expiry || ""} onChange={(e) => setF({ ...f, expiry: e.target.value })} /></Field>}
        <Field l="ملاحظة"><input value={f.note || ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field></div>
      <div className="actions"><button className="btn" onClick={save}>تسجيل وترحيل ✓</button></div></div>
    <Tbl title="الرسوم الحكومية والتجديدات" head={["التاريخ", "الموظف", "النوع", "المبلغ", "الضريبة", "الإجمالي", "ملاحظة"]} rows={fees.map((x) => [x.paid_on, x.employee_id ? emp(x.employee_id) : "المنشأة", x.kind, n(x.amount), n(x.vat), n(+x.amount + +x.vat), x.note || ""])} /></>);
}

// ===== ربط الأحداث بالحسابات =====
export function Mappings() {
  const ac = useAcct();
  const [rows, setRows] = useState<Row[]>([]), [msg, setMsg] = useState("");
  const load = useCallback(async () => { const { data } = await sb.from(T("acct_mappings")).select("*").order("event"); setRows(data || []); }, []);
  useEffect(() => { load(); }, [load]);
  async function save(ev: string, k: "debit_code" | "credit_code", v: string) { const { error } = await sb.from(T("acct_mappings")).update({ [k]: v || null }).eq("org_id", getOrg()).eq("event", ev); setMsg(error ? error.message : "تم الحفظ"); await load(); }
  const sel = (ev: string, k: "debit_code" | "credit_code", v: string | null) => <select value={v || ""} onChange={(e) => save(ev, k, e.target.value)}><option value="">— (يُحدَّد عند التنفيذ)</option>{ac.leaves.map((a) => <option key={a.id} value={a.code}>{a.code} {a.name}</option>)}</select>;
  return (<><Setup ac={ac} /><div className="card"><h2>ربط الأحداث التلقائية بالحسابات</h2><div className="mut">كل حدث في النظام (اعتماد مصروف، صرف عهدة، سلفة، رسوم...) يُرحَّل تلقائيًا بقيد من الحساب المدين إلى الدائن المحدَّدين هنا.</div>{msg && <div className="ok">{msg}</div>}</div>
    <div className="card scroll"><table><thead><tr><th>الحدث</th><th>الحساب المدين</th><th>الحساب الدائن</th></tr></thead><tbody>{rows.map((r) => <tr key={r.event}><td>{r.event}</td><td>{sel(r.event, "debit_code", r.debit_code)}</td><td>{sel(r.event, "credit_code", r.credit_code)}</td></tr>)}{!rows.length && <tr><td colSpan={3} className="mut">لا توجد روابط. هيّئ شجرة الحسابات أولًا</td></tr>}</tbody></table></div></>);
}

// ===== السنوات المالية والإقفال =====
export function FiscalYears() {
  const [rows, setRows] = useState<Row[]>([]), [f, setF] = useState<Row>({ name: String(new Date().getFullYear()), start: yearStart(), end: today().slice(0, 4) + "-12-31" }), [msg, setMsg] = useState("");
  const load = useCallback(async () => { const { data } = await sb.from(T("fiscal_years")).select("*").order("start_date", { ascending: false }); setRows(data || []); }, []);
  useEffect(() => { load(); }, [load]);
  async function add() { const { error } = await sb.from(T("fiscal_years")).insert({ org_id: getOrg(), name: f.name, start_date: f.start, end_date: f.end }); setMsg(error ? error.message : ""); await load(); }
  async function close(r: Row) { if (!confirm(`إقفال السنة ${r.name}؟ سيُنشأ قيد إقفال يرحّل صافي النتيجة إلى الأرباح المبقاة (3200) وتُغلق الفترة فلا يُرحَّل عليها بعد ذلك.`)) return; const { error } = await sb.rpc("awtad_close_year", { p_year: r.id }); setMsg(error ? error.message : "أُقفلت السنة المالية"); await load(); }
  return (<><div className="card"><h2>السنوات المالية</h2>{msg && <div className="ok">{msg}</div>}<div className="row"><Field l="الاسم"><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field><Field l="من"><input type="date" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /></Field><Field l="إلى"><input type="date" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></Field><button className="btn" onClick={add}>إضافة</button></div></div>
    <div className="card scroll"><table><thead><tr><th>السنة</th><th>من</th><th>إلى</th><th>الحالة</th><th /></tr></thead><tbody>{rows.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.start_date}</td><td>{r.end_date}</td><td className={r.status === "مغلقة" ? "er" : "ok"}>{r.status}</td><td>{r.status === "مفتوحة" && <button className="btn sm dng" onClick={() => close(r)}>إقفال السنة</button>}</td></tr>)}{!rows.length && <tr><td colSpan={5} className="mut">لا توجد سنوات مالية</td></tr>}</tbody></table></div></>);
}
