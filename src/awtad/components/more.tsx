// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, ins, upd, del } from "@/awtad/lib/supabase";
import { Row, n, today } from "@/awtad/lib/calc";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
const csv = (name: string, rows: (string | number)[][]) => { const t = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"), a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], { type: "text/csv;charset=utf-8" })); a.download = name; a.click(); };

// ===== الإجابة على الاستبيان (مجهولة: لا يُسجَّل صاحب الرد، وتُسجَّل المشاركة لمنع التكرار) =====
export function SurveyAnswer() {
  const { d, reload } = useData();
  const [score, setScore] = useState<Record<number, number>>({}), [cm, setCm] = useState<Record<number, string>>({}), [msg, setMsg] = useState<Record<number, string>>({});
  const open = (d.surveys || []).filter((s) => s.status !== "مغلق");
  async function send(id: number) {
    const { data, error } = await sb.rpc("awtad_submit_survey", { p_survey: id, p_score: score[id] ?? 8, p_comment: cm[id] || null });
    setMsg({ ...msg, [id]: error ? error.message : data }); if (!error) await reload();
  }
  return (<>
    <div className="card"><h2>الاستبيانات المتاحة</h2><div className="mut">إجابتك مجهولة: يُسجَّل أنك شاركت فقط لمنع التكرار، ولا يُربط ردّك باسمك.</div></div>
    {open.map((s) => (<div className="card" key={s.id}><h2>{s.title}</h2><p>{s.question}</p>
      <div className="row"><Field l="الدرجة (0 إلى 10)"><input type="number" min={0} max={10} value={score[s.id] ?? 8} onChange={(e) => setScore({ ...score, [s.id]: +e.target.value })} /></Field>
        <Field l="تعليق (اختياري)"><input value={cm[s.id] || ""} onChange={(e) => setCm({ ...cm, [s.id]: e.target.value })} /></Field><button className="btn" onClick={() => send(s.id)}>إرسال</button></div>
      {msg[s.id] && <div className={msg[s.id].startsWith("شكرًا") ? "ok" : "er"}>{msg[s.id]}</div>}</div>))}
    {!open.length && <div className="card mut">لا توجد استبيانات مفتوحة حاليًا.</div>}</>);
}

// ===== معايرة التقييمات =====
export function Calibration() {
  const { d, emp } = useData();
  const cycles = d.review_cycles || [], [id, setId] = useState("");
  const cyc = cycles.find((c) => String(c.id) === (id || String(cycles[0]?.id)));
  const R = (d.reviews || []).filter((r) => cyc && (r.cycle_id === cyc.id || r.cycle === cyc.name));
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const dept = (eid: any) => (d.employees || []).find((e) => e.id === eid)?.dept || "غير محدد";
  const group = (f: (r: Row) => string) => { const m: Record<string, number[]> = {}; R.forEach((r) => (m[f(r)] = [...(m[f(r)] || []), +r.score || 0])); return Object.entries(m).map(([k, a]) => [k, a.length, avg(a)] as [string, number, number]); };
  const all = avg(R.map((r) => +r.score || 0)), byDept = group((r) => dept(r.employee_id)), byType = group((r) => r.reviewer_type || "—");
  const dist = [1, 2, 3, 4, 5].map((k) => [k, R.filter((r) => Math.round(+r.score) === k).length] as [number, number]);
  const perEmp: Record<string, number[]> = {}; R.forEach((r) => (perEmp[r.employee_id] = [...(perEmp[r.employee_id] || []), +r.score || 0]));
  const deptAvg = Object.fromEntries(byDept.map(([k, , v]) => [k, v]));
  const out = Object.entries(perEmp).map(([eid, a]) => ({ eid, a: avg(a), dev: avg(a) - (deptAvg[dept(+eid)] ?? all) })).filter((x) => Math.abs(x.dev) >= 1);
  return (<>
    <div className="card"><h2>معايرة التقييمات</h2><Field l="دورة التقييم"><select value={id || String(cycles[0]?.id ?? "")} onChange={(e) => setId(e.target.value)}>{cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      {cyc?.criteria && <div className="mut" style={{ marginTop: 8 }}>المعايير: {cyc.criteria}</div>}<div className="mut">{R.length} تقييمًا — المتوسط العام {n(all)}</div></div>
    <div className="two"><div className="card"><h2>المتوسط حسب القسم</h2>{byDept.map(([k, c, v]) => <div className="hbar" key={k}><span>{k}</span><div className="track"><div style={{ width: `${(v / 5) * 100}%` }} /></div><b>{n(v)} ({c})</b></div>)}{!byDept.length && <div className="mut">لا توجد تقييمات</div>}</div>
      <div className="card"><h2>المتوسط حسب نوع المقيّم</h2>{byType.map(([k, c, v]) => <div className="hbar" key={k}><span>{k}</span><div className="track"><div style={{ width: `${(v / 5) * 100}%` }} /></div><b>{n(v)} ({c})</b></div>)}</div></div>
    <div className="card"><h2>توزيع الدرجات</h2>{dist.map(([k, v]) => <div className="hbar" key={k}><span>الدرجة {k}</span><div className="track"><div style={{ width: `${R.length ? (v / R.length) * 100 : 0}%` }} /></div><b>{v}</b></div>)}</div>
    <div className="card scroll"><h2>موظفون ينحرف تقييمهم عن متوسط قسمهم (±1 فأكثر)</h2><table><thead><tr><th>الموظف</th><th>متوسطه</th><th>الانحراف</th></tr></thead><tbody>{out.map((x) => <tr key={x.eid}><td>{emp(+x.eid)}</td><td>{n(x.a)}</td><td className={x.dev > 0 ? "ok" : "er"}>{x.dev > 0 ? "+" : ""}{n(x.dev)}</td></tr>)}{!out.length && <tr><td colSpan={3} className="mut">لا انحرافات تستدعي المراجعة</td></tr>}</tbody></table></div></>);
}

// ===== منشئ التقارير =====
const DS: [string, string][] = [["employees", "الموظفون"], ["leaves", "الإجازات"], ["attendance", "الحضور (الشهر الحالي)"], ["requests", "الطلبات"], ["expenses", "المصروفات"], ["loans", "السلف"], ["candidates", "المرشحون"], ["trips", "رحلات العمل"], ["assets", "الأصول"], ["documents", "المستندات"], ["trainings", "التدريب"], ["reviews", "التقييمات"]];
type Flt = { c: string; op: string; v: string };
export function ReportBuilder() {
  const { d, reload } = useData();
  const [ds, setDs] = useState("employees"), [cols, setCols] = useState<string[]>([]), [fl, setFl] = useState<Flt[]>([]), [sort, setSort] = useState(""), [desc, setDesc] = useState(false), [name, setName] = useState(""), [msg, setMsg] = useState("");
  const rows: Row[] = d[ds] || [];
  const keys = Array.from(new Set(rows.slice(0, 60).flatMap((r) => Object.keys(r)))).filter((k) => !["org_id", "approvals", "cv_text", "secret", "lines"].includes(k));
  const use = cols.length ? cols.filter((c) => keys.includes(c)) : keys.slice(0, 6);
  const ok = (r: Row) => fl.every((f) => { if (!f.c) return true; const a = r[f.c], b = f.v, num = !isNaN(+a) && !isNaN(+b) && String(a).trim() !== "" && b.trim() !== "";
    return f.op === "يحتوي" ? String(a ?? "").includes(b) : f.op === "=" ? String(a ?? "") === b : f.op === "≠" ? String(a ?? "") !== b : f.op === ">" ? (num ? +a > +b : String(a) > b) : (num ? +a < +b : String(a) < b); });
  let out = rows.filter(ok); if (sort) out = [...out].sort((a, b) => (String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), "ar", { numeric: true })) * (desc ? -1 : 1));
  async function save() { if (!name.trim()) return setMsg("اكتب اسمًا للتقرير"); try { await ins("saved_reports", { name: name.trim(), dataset: ds, columns: use, filters: fl }); setName(""); setMsg("حُفظ التقرير"); await reload(); } catch (e: any) { setMsg(e.message); } }
  function load(r: Row) { setDs(r.dataset); setCols(r.columns || []); setFl(r.filters || []); setMsg("حُمّل التقرير: " + r.name); }
  return (<>
    <div className="card"><h2>منشئ التقارير</h2>
      <div className="row"><Field l="مصدر البيانات"><select value={ds} onChange={(e) => { setDs(e.target.value); setCols([]); setFl([]); setSort(""); }}>{DS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field l="الترتيب"><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="">—</option>{keys.map((k) => <option key={k}>{k}</option>)}</select></Field>
        <label className="chk"><input type="checkbox" checked={desc} onChange={(e) => setDesc(e.target.checked)} />تنازلي</label></div>
      <h2 style={{ margin: "14px 0 6px" }}>الأعمدة</h2><div className="modgrid">{keys.map((k) => <label key={k} className="chk"><input type="checkbox" checked={use.includes(k)} onChange={(e) => setCols(e.target.checked ? [...use, k] : use.filter((x) => x !== k))} />{k}</label>)}</div>
      <h2 style={{ margin: "14px 0 6px" }}>المرشحات</h2>
      {fl.map((f, i) => <div className="row" key={i} style={{ marginBottom: 6 }}><select value={f.c} onChange={(e) => setFl(fl.map((x, j) => (j === i ? { ...x, c: e.target.value } : x)))}><option value="">عمود</option>{keys.map((k) => <option key={k}>{k}</option>)}</select>
        <select value={f.op} onChange={(e) => setFl(fl.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)))}>{["يحتوي", "=", "≠", ">", "<"].map((o) => <option key={o}>{o}</option>)}</select>
        <input value={f.v} onChange={(e) => setFl(fl.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))} /><button className="btn sm dng" onClick={() => setFl(fl.filter((_, j) => j !== i))}>حذف</button></div>)}
      <button className="btn soft" onClick={() => setFl([...fl, { c: "", op: "يحتوي", v: "" }])}>إضافة مرشح</button>
      <div className="actions"><button className="btn" onClick={() => csv(`awtad-${ds}.csv`, [use, ...out.map((r) => use.map((k) => (typeof r[k] === "object" ? JSON.stringify(r[k]) : r[k])))])}>تنزيل CSV</button>
        <Field l="اسم للحفظ"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><button className="btn soft" onClick={save}>حفظ التعريف</button></div>{msg && <div className="ok">{msg}</div>}</div>
    {(d.saved_reports || []).length > 0 && <div className="card"><h2>تقارير محفوظة</h2>{(d.saved_reports || []).map((r) => <div className="docrow" key={r.id}><b>{r.name} <span className="chip">{DS.find((x) => x[0] === r.dataset)?.[1]}</span></b><span><button className="btn sm" onClick={() => load(r)}>تحميل</button><button className="btn sm dng" onClick={async () => { await del("saved_reports", r.id); await reload(); }}>حذف</button></span></div>)}</div>}
    <div className="card scroll"><div className="mut">{out.length} صفًا — يُعرض أول 200</div><table><thead><tr>{use.map((k) => <th key={k}>{k}</th>)}</tr></thead><tbody>{out.slice(0, 200).map((r, i) => <tr key={i}>{use.map((k) => <td key={k}>{typeof r[k] === "object" ? JSON.stringify(r[k]) : String(r[k] ?? "")}</td>)}</tr>)}</tbody></table></div></>);
}

// ===== الإجراءات الجماعية =====
export function BulkActions() {
  const { d, reload } = useData();
  const emps = (d.employees || []).filter((e) => e.active !== false), [sel, setSel] = useState<number[]>([]), [dept, setDept] = useState(""), [act, setAct] = useState("notify");
  const [p, setP] = useState<Record<string, string>>({}), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const shown = emps.filter((e) => !dept || e.dept === dept), depts = Array.from(new Set(emps.map((e) => e.dept).filter(Boolean)));
  const ids = sel.filter((i) => emps.some((e) => e.id === i));
  const set = (k: string, v: string) => setP({ ...p, [k]: v });
  async function run() {
    if (!ids.length) return setMsg("اختر موظفًا واحدًا على الأقل");
    if (!confirm(`تنفيذ الإجراء على ${ids.length} موظفًا؟`)) return;
    setBusy(true); let ok = 0; setMsg("");
    try {
      for (const id of ids) {
        if (act === "notify") await ins("notifications", { employee_id: id, title: p.title || "إشعار", body: p.body || "", kind: "عام" });
        else if (act === "shift") await ins("shift_assign", { employee_id: id, shift_id: +(p.shift || d.shifts?.[0]?.id), from_date: p.from || today(), repeat_rule: "none" });
        else if (act === "dept") await upd("employees", id, { dept: p.dept || null });
        else if (act === "group") await upd("employees", id, { pay_group: p.group || null });
        else if (act === "off") await upd("employees", id, { active: false });
        else if (act === "on") await upd("employees", id, { active: true });
        else if (act === "leave") { const f = p.from || today(), t = p.to || f; await ins("leaves", { employee_id: id, type: p.type || "سنوية", from_date: f, to_date: t, days: Math.round((+new Date(t) - +new Date(f)) / 864e5) + 1, status: "معتمدة" }); }
        ok++;
      }
      setMsg(`نُفّذ الإجراء على ${ok} موظفًا`); await reload();
    } catch (e: any) { setMsg(`توقف بعد ${ok}: ${e.message}`); } finally { setBusy(false); }
  }
  return (<>
    <div className="card"><h2>الإجراءات الجماعية</h2>
      <div className="row"><Field l="الإجراء"><select value={act} onChange={(e) => setAct(e.target.value)}><option value="notify">إرسال إشعار</option><option value="shift">إسناد مناوبة</option><option value="leave">إضافة إجازة معتمدة</option><option value="dept">نقل إلى قسم</option><option value="group">تغيير مجموعة الرواتب</option><option value="off">تعطيل</option><option value="on">تفعيل</option></select></Field>
        {act === "notify" && <><Field l="العنوان"><input value={p.title || ""} onChange={(e) => set("title", e.target.value)} /></Field><Field l="المحتوى"><input value={p.body || ""} onChange={(e) => set("body", e.target.value)} /></Field></>}
        {act === "shift" && <><Field l="المناوبة"><select value={p.shift || ""} onChange={(e) => set("shift", e.target.value)}>{(d.shifts || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field><Field l="من تاريخ"><input type="date" value={p.from || today()} onChange={(e) => set("from", e.target.value)} /></Field></>}
        {act === "leave" && <><Field l="النوع"><select value={p.type || "سنوية"} onChange={(e) => set("type", e.target.value)}>{["سنوية", "مرضية", "بدون راتب", "زواج", "وفاة", "مولود", "حج", "امتحانات"].map((t) => <option key={t}>{t}</option>)}</select></Field><Field l="من"><input type="date" value={p.from || today()} onChange={(e) => set("from", e.target.value)} /></Field><Field l="إلى"><input type="date" value={p.to || p.from || today()} onChange={(e) => set("to", e.target.value)} /></Field></>}
        {act === "dept" && <Field l="القسم الجديد"><input value={p.dept || ""} onChange={(e) => set("dept", e.target.value)} /></Field>}
        {act === "group" && <Field l="مجموعة الرواتب"><input value={p.group || ""} onChange={(e) => set("group", e.target.value)} /></Field>}
        <button className="btn" onClick={run} disabled={busy}>{busy ? "جارٍ التنفيذ..." : `تنفيذ على ${ids.length}`}</button></div>{msg && <div className={msg.startsWith("نُفّذ") ? "ok" : "er"}>{msg}</div>}</div>
    <div className="card"><div className="row"><Field l="تصفية بالقسم"><select value={dept} onChange={(e) => setDept(e.target.value)}><option value="">الكل</option>{depts.map((x) => <option key={x}>{x}</option>)}</select></Field>
      <button className="btn soft" onClick={() => setSel(Array.from(new Set([...sel, ...shown.map((e) => e.id)])))}>تحديد المعروضين</button><button className="btn soft" onClick={() => setSel([])}>إلغاء التحديد</button></div>
      <div className="modgrid" style={{ marginTop: 10 }}>{shown.map((e) => <label key={e.id} className="chk"><input type="checkbox" checked={sel.includes(e.id)} onChange={(x) => setSel(x.target.checked ? [...sel, e.id] : sel.filter((i) => i !== e.id))} />{e.name} <span className="mut">{e.dept}</span></label>)}</div></div></>);
}

// ===== تعيين مسار تعلم لموظف =====
export function AssignPath() {
  const { d, reload } = useData();
  const [pid, setPid] = useState(""), [eid, setEid] = useState(""), [msg, setMsg] = useState("");
  async function go() {
    const p = pid || String(d.learning_paths?.[0]?.id), e = +(eid || d.employees?.[0]?.id);
    const cs = (d.path_courses || []).filter((x) => String(x.path_id) === p).sort((a, b) => (a.position || 0) - (b.position || 0));
    if (!cs.length || !e) return setMsg("أضف دورات للمسار وموظفًا أولًا");
    let k = 0; try { for (const c of cs) if (!(d.trainings || []).some((t) => t.employee_id === e && t.course_id === c.course_id)) { await ins("trainings", { employee_id: e, course_id: c.course_id, status: "مسجّل" }); k++; } setMsg(`سُجّل الموظف في ${k} دورة جديدة`); await reload(); } catch (x: any) { setMsg(x.message); }
  }
  return (<div className="card"><h2>تعيين مسار لموظف</h2><div className="row"><Field l="المسار"><select value={pid} onChange={(e) => setPid(e.target.value)}>{(d.learning_paths || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <Field l="الموظف"><select value={eid} onChange={(e) => setEid(e.target.value)}>{(d.employees || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><button className="btn" onClick={go}>تعيين</button></div>{msg && <div className="ok">{msg}</div>}</div>);
}

// ===== شهادات إتمام التدريب (قابلة للطباعة) =====
export function Certificates() {
  const { d, emp } = useData();
  const done = (d.trainings || []).filter((t) => t.status === "مكتمل"), [id, setId] = useState<number | null>(null);
  const t = done.find((x) => x.id === id), c = t && (d.courses || []).find((x) => x.id === t.course_id);
  return (<>
    <div className="card noprint"><h2>شهادات الإتمام</h2>{done.map((x) => <div className="docrow" key={x.id}><span>{emp(x.employee_id)} — {(d.courses || []).find((c2) => c2.id === x.course_id)?.title}</span><button className="btn sm" onClick={() => setId(x.id)}>عرض الشهادة</button></div>)}{!done.length && <div className="mut">لا توجد دورات مكتملة بعد.</div>}</div>
    {t && c && <div className="card cert"><div className="noprint" style={{ textAlign: "end" }}><button className="btn" onClick={() => window.print()}>طباعة</button></div>
      <h1>شهادة إتمام</h1><p>تشهد المنشأة بأن</p><h2>{emp(t.employee_id)}</h2><p>قد أتمّ بنجاح دورة</p><h2>{c.title}</h2><p>{c.hours ? `مدتها ${c.hours} ساعة` : ""}{c.provider ? ` — ${c.provider}` : ""}</p><p className="mut">بتاريخ {today()}</p></div>}</>);
}

// ===== إضافة العطلات الثابتة =====
export function SeedHolidays() {
  const { d, reload } = useData(); const [msg, setMsg] = useState("");
  async function seed() {
    const y = new Date().getFullYear(), have = new Set((d.holidays || []).map((h) => h.day)); let k = 0;
    try { for (const yy of [y, y + 1]) for (const [nm, md] of [["يوم التأسيس", "02-22"], ["اليوم الوطني", "09-23"]]) { const day = `${yy}-${md}`; if (!have.has(day)) { await ins("holidays", { name: nm, day, scope: "الجميع" }); k++; } } setMsg(`أُضيفت ${k} عطلة`); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<div className="card"><h2>العطلات الثابتة</h2><div className="mut">يضيف يوم التأسيس واليوم الوطني للعام الحالي والقادم. أعياد الفطر والأضحى ويوم عرفة تتغير سنويًا بحسب الرؤية، فأضفها يدويًا بتواريخها المعلنة.</div><p><button className="btn" onClick={seed}>إضافة العطلات الثابتة</button></p>{msg && <div className="ok">{msg}</div>}</div>);
}
