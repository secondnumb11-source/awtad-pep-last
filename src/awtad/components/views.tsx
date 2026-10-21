// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useEffect, useState } from "react";
import { useData, TABLES } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, T, ins, upd, del, getOrg, SUPABASE_URL } from "@/awtad/lib/supabase";
import { callIntegration } from "@/awtad/lib/mail";
import { empData, useIntegrations } from "./settings";
import { Row, Settings, addDays, addMin, dayOfWeek, distM, lateAfter, requiredHours, shiftStartFor, eosb, gross, loanDue, n, nitaqat, otFor, payRow, reimbFor, today } from "@/awtad/lib/calc";

// صفوف المسير للشهر الحالي: الإضافي المعتمد وأقساط السلف تُحتسب تلقائيًا
function usePay() {
  const { d, set } = useData();
  const ym = today().slice(0, 7);
  return (d.employees || []).filter((x) => x.active !== false).map((x) => payRow(x, set, otFor(d.requests || [], x.id, ym), 0, loanDue(d.loans || [], x.id, ym), reimbFor(d.expenses || [], x.id)));
}
const Field = ({ l, children }: { l: string; children: ReactNode }) => <label>{l}{children}</label>;

export function Dashboard() {
  const { d, set } = useData();
  const emps = (d.employees || []).filter((x) => x.active !== false), lim = addDays(today(), 60);
  const alerts: [string, string, string][] = [];
  emps.forEach((x) => { if (x.iqama_expiry && x.iqama_expiry <= lim) alerts.push([x.name, "انتهاء الإقامة", x.iqama_expiry]); if (x.contract_end && x.contract_end <= lim) alerts.push([x.name, "انتهاء العقد", x.contract_end]); });
  const R = emps.map((x) => payRow(x, set));
  const K: [string, string][] = [
    [String(emps.length), `موظف (سعودي: ${emps.filter((x) => x.nat === "S").length})`],
    [String((d.leaves || []).filter((l) => l.status === "بانتظار الموافقة").length), "إجازات بانتظار الموافقة"],
    [String((d.expenses || []).filter((l) => l.status.startsWith("بانتظار")).length), "مصروفات بانتظار الاعتماد"],
    [n(R.reduce((a, r) => a + r.net, 0)), "صافي الرواتب (ر.س)"],
    [n(R.reduce((a, r) => a + r.g + r.gr, 0)), "تكلفة الموظفين شاملة حصة المنشأة (ر.س)"]];
  return (<>
    <div className="grid">{K.map(([v, l]) => <div className="card kpi" key={l}><div className="num">{v}</div><div className="mut">{l}</div></div>)}</div>
    <div className="card scroll"><h2>تنبيهات الامتثال</h2>
      {alerts.length ? <table><thead><tr><th>الموظف</th><th>التنبيه</th><th>التاريخ</th></tr></thead><tbody>{alerts.map((a, i) => <tr key={i}><td>{a[0]}</td><td className="wa">{a[1]}</td><td>{a[2]}{a[2] < today() && <span className="er"> (منتهي)</span>}</td></tr>)}</tbody></table> : <span className="ok">لا توجد مستندات تنتهي خلال 60 يومًا</span>}
    </div></>);
}

export function Attendance() {
  const { d, set, reload } = useData();
  const { user } = useAuth();
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [selfie, setSelfie] = useState<File | null>(null);
  const A = Object.fromEntries((d.attendance || []).filter((r) => r.day === today()).map((r) => [r.employee_id, r]));
  const locs = (d.locations || []).filter((l) => l.active && l.lat != null && l.lng != null);
  async function punch(id: number, k: "check_in" | "check_out") {
    setBusy(true); setMsg("");
    try {
      const extra: Row = {};
      if (user?.role === "employee" && locs.length) {
        const pos: GeolocationPosition = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000 }));
        const best = locs.map((l) => ({ l, dist: distM(pos.coords.latitude, pos.coords.longitude, +l.lat, +l.lng) })).sort((a, b) => a.dist - b.dist)[0];
        if (best.dist > (+best.l.radius_m || 100)) { setMsg(`أنت خارج نطاق «${best.l.name}» (تبعد ${Math.round(best.dist)} م، المسموح ${best.l.radius_m} م)`); return; }
        Object.assign(extra, { lat: pos.coords.latitude, lng: pos.coords.longitude, location_id: best.l.id, in_range: true });
      }
      if (selfie && user?.role === "employee") { const path = `${user.orgId}/${id}/selfies/${Date.now()}.jpg`; const up = await sb.storage.from("awtad-docs").upload(path, selfie, { contentType: selfie.type || "image/jpeg" }); if (up.error) { setMsg("تعذّر رفع الصورة: " + up.error.message); return; } extra.selfie_path = path; }
      const { error } = await sb.from(T("attendance")).upsert({ org_id: getOrg(), employee_id: id, day: today(), [k]: new Date().toTimeString().slice(0, 8), ...extra }, { onConflict: "employee_id,day" });
      if (error) setMsg(error.message); else await reload();
    } catch (e: any) { setMsg(e?.code === 1 ? "لم يُسمح بالوصول إلى الموقع. فعّل صلاحية الموقع للمتصفح ثم أعد المحاولة" : "تعذّر تحديد موقعك: " + (e?.message || "")); }
    finally { setBusy(false); }
  }
  return (<div className="card scroll"><h2>سجل اليوم {today()}</h2><div className="mut">بداية الدوام {set.shift} — سماح 15 دقيقة{locs.length ? ` — التسجيل مقيّد بمواقع العمل (${locs.length}) للموظفين` : ""}</div>{msg && <div className="er">{msg}</div>}
    {user?.role === "employee" && <div className="row" style={{ margin: "8px 0" }}><Field l="صورة سيلفي مع التسجيل (اختياري)"><input type="file" accept="image/*" capture="user" onChange={(e) => setSelfie(e.target.files?.[0] || null)} /></Field></div>}
    <table><thead><tr><th>الموظف</th><th>حضور</th><th>انصراف</th><th>الحالة</th><th>الموقع</th><th /></tr></thead><tbody>
      {(d.employees || []).filter((x) => x.active !== false).map((x) => { const r = A[x.id] || {}, ci = (r.check_in || "").slice(0, 5), co = (r.check_out || "").slice(0, 5), late = ci && ci > lateAfter(d, set.shift, x.id, today());
        return <tr key={x.id}><td>{x.name}</td><td>{ci || "—"}</td><td>{co || "—"}</td><td className={r.excused ? "ok" : late ? "wa" : ci ? "ok" : "er"}>{r.excused ? "معذور" : late ? "متأخر" : ci ? "حاضر" : "لم يسجل"}</td>
          <td>{r.lat != null ? <a className="ok" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">{r.in_range ? "ضمن النطاق" : "خارج النطاق"}</a> : "—"}</td>
          <td><button className="btn sm" disabled={busy} onClick={() => punch(x.id, "check_in")}>حضور</button><button className="btn sm" disabled={busy} onClick={() => punch(x.id, "check_out")}>انصراف</button></td></tr>; })}</tbody></table></div>);
}

export function Payroll() {
  const { d, set, saveSet, reload } = useData();
  const { user } = useAuth();
  const [ot, setOt] = useState<Record<number, number>>({}), [ab, setAb] = useState<Record<number, number>>({}), [grp, setGrp] = useState(""), [ent, setEnt] = useState(""), [msg, setMsg] = useState("");
  const ym = today().slice(0, 7);
  const all = (d.employees || []).filter((x) => x.active !== false);
  const groups = Array.from(new Set(all.map((x) => x.pay_group).filter(Boolean)));
  const R = all.filter((x) => (!grp || x.pay_group === grp) && (!ent || String(x.entity_id) === ent)).map((x) => payRow(x, set, ot[x.id] ?? otFor(d.requests || [], x.id, ym), ab[x.id] || 0, loanDue(d.loans || [], x.id, ym), reimbFor(d.expenses || [], x.id)));
  const S = (k: "g" | "otp" | "abd" | "ge" | "gr" | "net" | "loan" | "reimb") => R.reduce((a, r) => a + r[k], 0);
  const inp = (k: keyof Settings, l: string) => <Field l={l}><input type="number" step="0.01" style={{ width: 100 }} value={set[k] as number} onChange={(e) => saveSet({ ...set, [k]: +e.target.value })} /></Field>;
  async function closeExpenses() {
    const ids = new Set(R.map((r) => r.x.id)), list = (d.expenses || []).filter((e) => e.status === "معتمد" && e.reimburse !== false && !e.paid_in && ids.has(e.employee_id));
    if (!list.length) return setMsg("لا توجد تعويضات معلّقة");
    if (!confirm(`تحديد ${list.length} مصروفًا معتمدًا كمصروف في مسير ${ym}؟`)) return;
    try { for (const e of list) await upd("expenses", e.id, { paid_in: ym }); setMsg(`تم ترحيل ${list.length} مصروفًا`); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<>
    <div className="card"><h2>إعدادات التأمينات (راجع النسب الحالية لدى المؤسسة)</h2><div className="row">{inp("sEmp", "حصة الموظف السعودي %")}{inp("sEr", "حصة المنشأة (سعودي) %")}{inp("nEr", "حصة المنشأة (غير سعودي) %")}{inp("cap", "سقف الأجر الخاضع")}</div>
      <div className="mut">الأجر الخاضع = الأساسي + السكن. الإضافي = ساعات × (الأساسي ÷ 30 ÷ 8) × 1.5، وتُعبّأ الساعات تلقائيًا من طلبات العمل الإضافي المعتمدة المعوَّضة بأجر. الغياب = أيام × (الإجمالي ÷ 30). أقساط السلف وتعويضات المصروفات المعتمدة تُحتسب تلقائيًا. الموظفون غير النشطين مستبعدون.</div></div>
    <div className="card scroll"><div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>مسير {ym}</h2>
      <div className="row"><Field l="الكيان"><select value={ent} onChange={(e) => setEnt(e.target.value)}><option value="">الكل</option>{(d.entities || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><Field l="مجموعة الرواتب"><select value={grp} onChange={(e) => setGrp(e.target.value)}><option value="">الكل</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        {["admin", "hr"].includes(user?.role || "") && <button className="btn sm" onClick={closeExpenses}>ترحيل تعويضات المصروفات</button>}</div></div>{msg && <div className="ok">{msg}</div>}
      <table><thead><tr><th>الموظف</th><th>الإجمالي</th><th>ساعات إضافي</th><th>أيام غياب</th><th>أجر الإضافي</th><th>خصم الغياب</th><th>تأمينات الموظف</th><th>تأمينات المنشأة</th><th>قسط سلفة</th><th>تعويض مصروفات</th><th>الصافي</th></tr></thead><tbody>
      {R.map((r) => <tr key={r.x.id}><td>{r.x.name}</td><td>{n(r.g)}</td>
        <td><input type="number" min={0} style={{ width: 64 }} value={ot[r.x.id] ?? r.ot} onChange={(e) => setOt({ ...ot, [r.x.id]: +e.target.value })} /></td>
        <td><input type="number" min={0} style={{ width: 64 }} value={ab[r.x.id] ?? 0} onChange={(e) => setAb({ ...ab, [r.x.id]: +e.target.value })} /></td>
        <td>{n(r.otp)}</td><td>{n(r.abd)}</td><td>{n(r.ge)}</td><td>{n(r.gr)}</td><td>{n(r.loan)}</td><td>{n(r.reimb)}</td><td><b>{n(r.net)}</b></td></tr>)}
      <tr><th>الإجمالي</th><th>{n(S("g"))}</th><th /><th /><th>{n(S("otp"))}</th><th>{n(S("abd"))}</th><th>{n(S("ge"))}</th><th>{n(S("gr"))}</th><th>{n(S("loan"))}</th><th>{n(S("reimb"))}</th><th>{n(S("net"))}</th></tr></tbody></table></div></>);
}

const IBAN = /^SA\d{22}$/;
export function Wps() {
  const { d, set, reload } = useData();
  const R = usePay();
  async function save(id: number, k: string, v: string) { await upd("employees", id, { [k]: v.trim() }); await reload(); }
  function download() {
    const bad = R.filter((r) => !IBAN.test(r.x.iban || ""));
    if (bad.length && !confirm(`يوجد ${bad.length} آيبان ناقص. متابعة؟`)) return;
    const rows = [["الاسم", "الآيبان", "رمز البنك", "الأساسي", "السكن", "بدلات أخرى", "خصومات", "الصافي"],
      ...R.map((r) => [r.x.name, r.x.iban || "", r.x.bank_code || "", r.x.basic, r.x.house, (+r.x.trans || 0) + (+r.x.other || 0) + r.otp, r.abd + r.ge + r.loan, r.net.toFixed(2)])];
    const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = `awtad-wps-${today().slice(0, 7)}.csv`; a.click();
  }
  return (<>
    <div className="card"><h2>ملف تحويل الرواتب (حماية الأجور)</h2><div className="mut">أدخل الآيبان ورمز البنك لكل موظف ثم نزّل الملف. الصيغة عامة (CSV) وتحتاج مطابقة مع صيغة بنكك أو منصة مدد قبل الرفع الفعلي.</div></div>
    <div className="card scroll"><table><thead><tr><th>الموظف</th><th>الآيبان</th><th>رمز البنك</th><th>الصافي</th><th>الحالة</th></tr></thead><tbody>
      {R.map((r) => <tr key={r.x.id}><td>{r.x.name}</td>
        <td><input defaultValue={r.x.iban || ""} size={28} onBlur={(e) => e.target.value !== (r.x.iban || "") && save(r.x.id, "iban", e.target.value)} /></td>
        <td><input defaultValue={r.x.bank_code || ""} size={6} onBlur={(e) => e.target.value !== (r.x.bank_code || "") && save(r.x.id, "bank_code", e.target.value)} /></td>
        <td>{n(r.net)}</td><td className={IBAN.test(r.x.iban || "") ? "ok" : "er"}>{IBAN.test(r.x.iban || "") ? "صالح الشكل" : "آيبان ناقص"}</td></tr>)}</tbody></table></div>
    <button className="btn" onClick={download}>تنزيل ملف CSV</button></>);
}

export function Journal() {
  const { d, set, reload } = useData();
  const [period, setPeriod] = useState(today().slice(0, 7)), [msg, setMsg] = useState("");
  const R = usePay(), S = (k: "g" | "otp" | "abd" | "ge" | "gr" | "loan" | "reimb") => R.reduce((a, r) => a + r[k], 0), net = R.reduce((a, r) => a + r.net, 0);
  const L: [string, number, number][] = ([["مصروف الرواتب والأجور", S("g") + S("otp") - S("abd"), 0], ["مصروف التأمينات (حصة المنشأة)", S("gr"), 0], ["مصروف تعويضات الموظفين", S("reimb"), 0], ["رواتب مستحقة الدفع", 0, net], ["التأمينات الاجتماعية المستحقة", 0, S("ge") + S("gr")], ["سلف الموظفين المستردة", 0, S("loan")]] as [string, number, number][]).map(([a, b, c]) => [a, +b.toFixed(2), +c.toFixed(2)]);
  const D = L.reduce((a, l) => a + l[1], 0), C = L.reduce((a, l) => a + l[2], 0), ok = Math.abs(D - C) < 0.01;
  async function toAcct() {
    const sm = (k: "g" | "otp" | "abd" | "ge" | "gr" | "loan" | "reimb" | "net") => R.reduce((x, r) => x + r[k], 0);
    const r2 = (x: number) => Math.round(x * 100) / 100;
    const { error } = await sb.rpc("awtad_post_payroll", { p_period: period, p_salary: r2(sm("g") - sm("abd")), p_ot: r2(sm("otp")), p_gr: r2(sm("gr")), p_reimb: r2(sm("reimb")), p_net: r2(sm("net")), p_social: r2(sm("ge") + sm("gr")), p_loan: r2(sm("loan")) });
    setMsg(error ? error.message : "رُحّل مسير " + period + " إلى المحاسبة (قيد رواتب)");
  }
  async function save() { try { await ins("journal_entries", { period, lines: L, total: D }); await reload(); setMsg(""); } catch (e: any) { setMsg(e.message); } }
  return (<>
    <div className="card scroll"><h2>قيد الرواتب المقترح</h2>{msg && <div className="er">{msg}</div>}
      <div className="row"><Field l="الفترة"><input value={period} onChange={(e) => setPeriod(e.target.value)} style={{ width: 100 }} /></Field><button className="btn" onClick={save}>حفظ القيد</button><button className="btn soft" onClick={toAcct}>ترحيل إلى المحاسبة</button></div>
      <table><thead><tr><th>الحساب</th><th>مدين</th><th>دائن</th></tr></thead><tbody>{L.map((l) => <tr key={l[0]}><td>{l[0]}</td><td>{n(l[1])}</td><td>{n(l[2])}</td></tr>)}<tr><th>الإجمالي</th><th>{n(D)}</th><th>{n(C)}</th></tr></tbody></table>
      <div className={ok ? "ok" : "er"}>{ok ? "القيد متوازن" : "القيد غير متوازن"}</div></div>
    <div className="card scroll"><h2>القيود المحفوظة</h2><table><thead><tr><th>الفترة</th><th>الإجمالي</th><th>التاريخ</th></tr></thead><tbody>
      {(d.journal_entries || []).map((j) => <tr key={j.id}><td>{j.period}</td><td>{n(j.total)}</td><td>{(j.created_at || "").slice(0, 10)}</td></tr>)}</tbody></table></div></>);
}

export function Eosb() {
  const [w, setW] = useState(""), [s, setS] = useState(""), [e, setE] = useState(today()), [why, setWhy] = useState<"end" | "resign">("end");
  const r = w && s ? eosb(+w, s, e, why) : null;
  return (<div className="card"><h2>حاسبة مكافأة نهاية الخدمة</h2><div className="row">
    <Field l="آخر أجر شامل"><input type="number" style={{ width: 110 }} value={w} onChange={(x) => setW(x.target.value)} /></Field>
    <Field l="بداية العمل"><input type="date" value={s} onChange={(x) => setS(x.target.value)} /></Field><Field l="نهاية العمل"><input type="date" value={e} onChange={(x) => setE(x.target.value)} /></Field>
    <Field l="السبب"><select value={why} onChange={(x) => setWhy(x.target.value as any)}><option value="end">إنهاء العقد / فصل</option><option value="resign">استقالة</option></select></Field></div>
    {r && <div className="num">المستحق: {n(r.amt)} ر.س <span className="mut">(الخدمة {r.y.toFixed(2)} سنة — قبل تخفيض الاستقالة: {n(r.full)})</span></div>}
    <div className="mut">نصف شهر عن كل سنة من أول 5 سنوات وشهر كامل بعدها. الاستقالة: لا شيء قبل سنتين، ثلث من 2 إلى 5، ثلثان من 5 إلى 10، كاملة بعد 10. راجع مختصًا قانونيًا للحالات الخاصة.</div></div>);
}

export function SalaryCalc() {
  const { set } = useData();
  const [t, setT] = useState(""), [h, setH] = useState(25), [tr, setTr] = useState(10), [nat, setNat] = useState("S");
  const total = +t, b = total / (1 + h / 100 + tr / 100), hs = (b * h) / 100, tn = (b * tr) / 100, ge = nat === "S" ? (Math.min(b + hs, set.cap) * set.sEmp) / 100 : 0;
  return (<div className="card"><h2>حاسبة تقسيم الراتب</h2><div className="row">
    <Field l="الراتب الإجمالي"><input type="number" style={{ width: 120 }} value={t} onChange={(e) => setT(e.target.value)} /></Field>
    <Field l="نسبة السكن % من الأساسي"><input type="number" style={{ width: 90 }} value={h} onChange={(e) => setH(+e.target.value)} /></Field>
    <Field l="نسبة النقل % من الأساسي"><input type="number" style={{ width: 90 }} value={tr} onChange={(e) => setTr(+e.target.value)} /></Field>
    <Field l="الجنسية"><select value={nat} onChange={(e) => setNat(e.target.value)}><option value="S">سعودي</option><option value="N">غير سعودي</option></select></Field></div>
    {total > 0 && <div className="grid">{([[b, "الأساسي"], [hs, "بدل السكن"], [tn, "بدل النقل"], [total - ge, `الصافي بعد تأمينات الموظف (${n(ge)})`]] as [number, string][]).map(([v, l]) => <div className="card kpi" key={l}><div className="num">{n(v)}</div><div className="mut">{l}</div></div>)}</div>}
    <div className="mut">التقسيم الافتراضي: السكن 25% والنقل 10% من الأساسي، ويمكن تعديل النسب بحسب عقدك.</div></div>);
}

export function Nitaqat() {
  const [tot, setTot] = useState(""), [sa, setSa] = useState(""), [th, setTh] = useState([40, 27, 20, 10]);
  const r = +tot > 0 && +sa <= +tot && sa !== "" ? nitaqat(+tot, +sa, th) : null;
  return (<div className="card"><h2>حاسبة نسبة التوطين</h2><div className="row">
    <Field l="إجمالي العاملين"><input type="number" style={{ width: 100 }} value={tot} onChange={(e) => setTot(e.target.value)} /></Field>
    <Field l="عدد السعوديين"><input type="number" style={{ width: 100 }} value={sa} onChange={(e) => setSa(e.target.value)} /></Field>
    {["حد البلاتيني %", "الأخضر المرتفع %", "الأخضر المتوسط %", "الأخضر المنخفض %"].map((l, i) => <Field key={l} l={l}><input type="number" style={{ width: 70 }} value={th[i]} onChange={(e) => setTh(th.map((v, j) => (j === i ? +e.target.value : v)))} /></Field>)}</div>
    {r && <><div className="num">{r.r.toFixed(1)}% — {r.band}</div>{r.next && <div>للوصول إلى «{r.next.name}» توظّف {r.need} سعوديًا إضافيًا تقريبًا.</div>}</>}
    <div className="mut">الحدود الافتراضية للتجربة فقط؛ تختلف حسب النشاط وحجم المنشأة، فأدخل الحدود الصحيحة من برنامج نطاقات.</div></div>);
}

export function Diag() {
  const [rows, setRows] = useState<[string, boolean, string][] | null>(null), [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); const out: [string, boolean, string][] = [];
    for (const t of ["organizations", ...TABLES]) {
      try { const { count, error } = await sb.from(T(t)).select("*", { count: "exact", head: true }); out.push([T(t), !error, error ? error.message : `${count} سجل`]); }
      catch (e: any) { out.push([T(t), false, String(e?.message || e)]); }
    }
    setRows(out); setBusy(false);
  }
  return (<div className="card scroll"><h2>فحص الاتصال بـ Supabase</h2><div className="mut">{SUPABASE_URL}</div>
    <p><button className="btn" onClick={run} disabled={busy}>{busy ? "جارٍ الفحص..." : "ابدأ الفحص"}</button></p>
    {rows && <table><thead><tr><th>الجدول</th><th>النتيجة</th><th>التفاصيل</th></tr></thead><tbody>{rows.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className={r[1] ? "ok" : "er"}>{r[1] ? "سليم" : "فشل"}</td><td>{r[2]}</td></tr>)}</tbody></table>}</div>);
}

// لوحة مراحل التوظيف
export function Board() {
  const { d, reload } = useData();
  const st = ["جديد", "فرز", "مقابلة", "عرض", "تعيين"];
  const mv = async (r: Row, s: number) => { await upd("candidates", r.id, { stage: s }); await reload(); };
  return (<div className="board">{st.map((s, i) => <div className="col" key={s}><b>{s}</b>
    {(d.candidates || []).filter((r) => +r.stage === i).map((r) => <div className="card" key={r.id}><b>{r.name}</b><div className="mut">{r.job}</div>
      {i > 0 && <button className="btn sm" onClick={() => mv(r, i - 1)}>→</button>}{i < 4 && <button className="btn sm" onClick={() => mv(r, i + 1)}>←</button>}</div>)}</div>)}</div>);
}

// قالب مهام الانضمام القياسي
const ONB = ["توقيع العقد", "استلام المستندات", "إنشاء البريد والحسابات", "تسليم المعدات", "جولة تعريفية", "تدريب السلامة"];
export function OnbTemplate() {
  const { d, reload } = useData();
  const [id, setId] = useState(""), [msg, setMsg] = useState("");
  async function make() {
    const eid = +(id || d.employees?.[0]?.id); if (!eid) return setMsg("أضف موظفًا أولًا");
    try { for (let i = 0; i < ONB.length; i++) await ins("onboarding_tasks", { employee_id: eid, title: ONB[i], due: addDays(today(), i * 2) }); setMsg(""); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<div className="card"><h2>قالب الانضمام القياسي</h2>{msg && <div className="er">{msg}</div>}<div className="row">
    <Field l="الموظف"><select value={id} onChange={(e) => setId(e.target.value)}>{(d.employees || []).filter((x) => x.active !== false).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
    <button className="btn" onClick={make}>إنشاء {ONB.length} مهام</button></div></div>);
}

// ===== مركز التكاملات الحكومية: جاهزية البيانات وملفات الرفع (لا اتصال مباشر بالمنصات) =====
const dl = (name: string, rows: (string | number)[][]) => {
  const csv = "\ufeff" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = name; a.click();
};
export function GovHub() {
  const { d, set, reload } = useData();
  const { rows: cfgRows } = useIntegrations();
  const [run, setRun] = useState<Record<string, string>>({}), [prog, setProg] = useState("");
  const KEY: Record<string, string> = { "قوى": "qiwa", "مدد": "mudad", "التأمينات الاجتماعية": "gosi", "مقيم": "muqeem", "أبشر أعمال": "absher", "ساند": "saned", "البنك": "bank" };
  async function runAll(plat: string, op: string, list: Row[]) {
    let ok = 0, bad = 0, last = ""; setProg(`جارٍ تشغيل «${op}»...`);
    for (const e of list) { const r = await callIntegration(KEY[plat], op, empData(e, set), e.name); if (r.ok) ok++; else { bad++; last = r.msg || r.body || ""; } }
    setProg(`«${op}» على ${plat}: نجح ${ok} وفشل ${bad}${last ? " — آخر خطأ: " + String(last).slice(0, 160) : ""}`); await reload();
  }
  const emps = (d.employees || []).filter((x) => x.active !== false), lim = addDays(today(), 60);
  const miss = (f: (x: Row) => boolean) => emps.filter(f);
  const PL = [
    { k: "قوى", role: "توثيق عقود العمل ونطاقات وخدمات المنشأة", need: "صلاحية مفوّض على منصة قوى، واعتماد كمزوّد تكامل رسمي لاستخدام واجهاتها", chk: miss((x) => !x.national_id || !x.qiwa_contract_no), chkL: "موظفون بلا رقم هوية أو رقم عقد قوى",
      file: ["awtad-qiwa-contracts.csv", ["الاسم", "رقم الهوية", "الجنسية", "المهنة", "الأساسي", "السكن", "النقل", "أخرى", "الإجمالي", "رقم عقد قوى"], (x: Row) => [x.name, x.national_id, x.nationality, x.job, x.basic, x.house, x.trans, x.other, gross(x), x.qiwa_contract_no]] },
    { k: "مدد", role: "رفع ملف حماية الأجور شهريًا", need: "حساب المنشأة على مدد، وصيغة الملف المعتمدة لدى بنك المنشأة. الراتب يجب أن يطابق عقد قوى", chk: miss((x) => !/^SA\d{22}$/.test(x.iban || "")), chkL: "موظفون بآيبان ناقص أو غير صالح الشكل",
      file: ["awtad-mudad-wages.csv", ["الاسم", "رقم الهوية", "الآيبان", "رمز البنك", "الراتب الإجمالي"], (x: Row) => [x.name, x.national_id, x.iban, x.bank_code, gross(x)]] },
    { k: "التأمينات الاجتماعية", role: "اشتراكات التأمينات وتسجيل المشتركين", need: "حساب المنشأة على بوابة التأمينات، ورقم اشتراك لكل موظف", chk: miss((x) => !x.national_id || !x.birth_date || !x.gosi_no), chkL: "موظفون ينقصهم رقم هوية أو ميلاد أو رقم اشتراك",
      file: ["awtad-gosi-contributions.csv", ["الاسم", "رقم الهوية", "رقم الاشتراك", "الأجر الخاضع", "حصة الموظف", "حصة المنشأة"], (x: Row) => { const r = payRow(x, set); return [x.name, x.national_id, x.gosi_no, Math.min((+x.basic || 0) + (+x.house || 0), set.cap), r.ge.toFixed(2), r.gr.toFixed(2)]; }] },
    { k: "مقيم", role: "الإقامات والتأشيرات وتجديدها", need: "حساب أبشر أعمال ومقيم للمنشأة، وصلاحية مفوّض", chk: miss((x) => x.nat === "N" && (!x.iqama_expiry || x.iqama_expiry <= lim)), chkL: "مقيمون إقامتهم منتهية أو تنتهي خلال 60 يومًا أو بلا تاريخ",
      file: ["awtad-muqeem-iqama.csv", ["الاسم", "رقم الإقامة", "تاريخ انتهاء الإقامة"], (x: Row) => [x.name, x.national_id, x.iqama_expiry]] },
    { k: "أبشر أعمال", role: "خدمات الجوازات والتأشيرات للمنشأة", need: "حساب أبشر أعمال ومفوّض معتمد", chk: [] as Row[], chkL: "", file: null as any },
    { k: "ساند", role: "التعطل عن العمل", need: "ربط حساب التأمينات، والتحقق من استحقاق الموظف", chk: [] as Row[], chkL: "", file: null as any },
    { k: "البنك", role: "تحويل الرواتب عبر واجهة البنك", need: "واجهة API من بنك المنشأة وصيغة طلب التحويل", chk: miss((x) => !/^SA\d{22}$/.test(x.iban || "")), chkL: "موظفون بآيبان ناقص أو غير صالح الشكل", file: null as any },
  ];
  const stOf = (p: string) => (d.integrations || []).find((x) => x.platform === p);
  async function setSt(p: string, status: string) {
    const row = stOf(p);
    if (row) await upd("integrations", row.id, { status }); else await ins("integrations", { platform: p, status });
    await ins("integration_logs", { platform: p, action: "تغيير الحالة إلى " + status, result: "نجحت" }); await reload();
  }
  return (<>
    <div className="card"><h2>مركز التكاملات الحكومية</h2>
      <div className="mut">هذه الصفحة تجهّز بياناتك وملفاتك لكل منصة وتتحقق من اكتمالها. الاتصال المباشر بواجهات المنصات الحكومية لم يُفعَّل بعد، لأنه يتطلب اعتمادًا رسميًا من كل جهة. حتى ذلك الحين ترفع الملفات الجاهزة يدويًا ثم تُسجّل العملية هنا.</div></div>
    {PL.map((p) => { const st = stOf(p.k)?.status || "غير مفعّل"; return (
      <div className="card" key={p.k}>
        <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>{p.k}</h2>
          <select value={st} onChange={(e) => setSt(p.k, e.target.value)}>{["غير مفعّل", "قيد التجهيز", "جاهز للرفع اليدوي", "متصل رسميًا"].map((o) => <option key={o}>{o}</option>)}</select></div>
        <div className="mut" style={{ margin: "8px 0" }}>{p.role}</div>
        <div><b>المتطلبات للربط الرسمي:</b> {p.need}</div>
        {p.chkL && <div className={p.chk.length ? "er" : "ok"} style={{ margin: "8px 0" }}>{p.chk.length ? `${p.chk.length} ${p.chkL}: ${p.chk.slice(0, 4).map((x) => x.name).join("، ")}${p.chk.length > 4 ? "..." : ""}` : "بيانات هذه المنصة مكتملة"}</div>}
        {p.file && <button className="btn sm" onClick={() => dl(p.file[0], [p.file[1], ...emps.map(p.file[2])])}>تنزيل ملف البيانات (CSV)</button>}
        {(() => { const cr = cfgRows.find((r) => r.provider === KEY[p.k]), opsN = Object.keys(cr?.config?.ops || {}); return cr?.has_secret && opsN.length ? <div className="row" style={{ marginTop: 8 }}><select value={run[p.k] || opsN[0]} onChange={(e) => setRun({ ...run, [p.k]: e.target.value })}>{opsN.map((o) => <option key={o}>{o}</option>)}</select><button className="btn" onClick={() => runAll(p.k, run[p.k] || opsN[0], emps)}>تشغيل على كل الموظفين</button></div> : <div className="mut" style={{ marginTop: 8 }}>أدخل المفتاح والعمليات من «الإعدادات والتكاملات» لتفعيل التشغيل المباشر.</div>; })()}
      </div>); })}
    {prog && <div className="card ok">{prog}</div>}
    <div className="card scroll"><h2>سجل العمليات</h2><table><thead><tr><th>المنصة</th><th>العملية</th><th>النتيجة</th><th>التاريخ</th></tr></thead><tbody>
      {[...(d.integration_logs || [])].reverse().slice(0, 15).map((l) => <tr key={l.id}><td>{l.platform}</td><td>{l.action}</td><td>{l.result}</td><td>{(l.created_at || "").slice(0, 16).replace("T", " ")}</td></tr>)}</tbody></table></div></>);
}

// توليد طلبات تجديد العقود التي تنتهي قريبًا
export function Renewals() {
  const { reload } = useData();
  const { user } = useAuth();
  const [days, setDays] = useState(60), [msg, setMsg] = useState("");
  if (!["admin", "hr"].includes(user?.role || "")) return null;
  async function gen() { const { data, error } = await sb.rpc("awtad_generate_renewals", { p_days: days }); setMsg(error ? error.message : `أُنشئ ${data} طلب تجديد`); await reload(); }
  return (<div className="card"><h2>طلبات تجديد العقود</h2><div className="row"><Field l="العقود التي تنتهي خلال (يوم)"><input type="number" value={days} style={{ width: 100 }} onChange={(e) => setDays(+e.target.value)} /></Field>
    <button className="btn" onClick={gen}>توليد الطلبات</button></div>{msg && <div className="ok">{msg}</div>}<div className="mut">ينشئ طلب تجديد لكل موظف نشط ينتهي عقده في الفترة ولا يملك طلب تجديد معلّقًا. شغّله شهريًا (التشغيل التلقائي الشهري يحتاج جدولة في Supabase وهي مؤجلة).</div></div>);
}


// بطاقات الموظفين مع رمز QR قابل للطباعة
import { QRCodeSVG } from "qrcode.react";
export function EmployeeCards() {
  const { d } = useData();
  const { user } = useAuth();
  const emps = (d.employees || []).filter((x) => x.active !== false);
  return (<>
    <div className="card noprint"><h2>بطاقات الموظفين</h2><div className="mut">رمز QR يحمل معرّف المنشأة والموظف للتعريف السريع، ويمكن طباعته ولصقه على البطاقة.</div><p><button className="btn" onClick={() => window.print()}>طباعة البطاقات</button></p></div>
    <div className="idcards">{emps.map((x) => (
      <div className="idcard" key={x.id}><div className="idhead">أوتاد</div><div className="idbody"><div><b>{x.name}</b><div className="mut">{x.job || "—"}</div><div className="mut">{x.dept || "—"}</div><div className="mut">رقم: {x.id}</div></div>
        <QRCodeSVG value={`awtad:${user?.orgId}:${x.id}`} size={84} /></div></div>))}</div></>);
}

// التقارير الميدانية: عنوان وتفاصيل وصورة وموقع
export function FieldReports() {
  const { d, reload, emp } = useData();
  const { user } = useAuth();
  const my = user?.employeeId;
  const emps = (d.employees || []).filter((x) => x.active !== false);
  const [eid, setEid] = useState(""), [title, setTitle] = useState(""), [body, setBody] = useState(""), [file, setFile] = useState<File | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function submit() {
    const id = my || +(eid || emps[0]?.id || 0);
    if (!id || !title.trim()) return setMsg("أدخل العنوان واختر الموظف");
    setBusy(true); setMsg("");
    try {
      let lat: number | null = null, lng: number | null = null;
      try { const p: GeolocationPosition = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })); lat = p.coords.latitude; lng = p.coords.longitude; } catch {}
      let path: string | null = null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("الحد الأقصى لحجم الصورة 8 ميغابايت");
        const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6);
        path = `${user!.orgId}/${id}/reports/${Date.now()}.${ext}`;
        const up = await sb.storage.from("awtad-docs").upload(path, file, { contentType: file.type || undefined });
        if (up.error) throw new Error(up.error.message);
      }
      await ins("field_reports", { employee_id: id, title: title.trim(), body, lat, lng, photo_path: path });
      setTitle(""); setBody(""); setFile(null); await reload();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function open(path: string) { const { data, error } = await sb.storage.from("awtad-docs").createSignedUrl(path, 60); if (error || !data) return alert(error?.message || "تعذّر الفتح"); window.open(data.signedUrl, "_blank"); }
  return (<>
    <div className="card"><h2>تقرير ميداني جديد</h2>{msg && <div className="er">{msg}</div>}<div className="fgrid">
      {!my && <Field l="الموظف"><select value={eid || String(emps[0]?.id ?? "")} onChange={(e) => setEid(e.target.value)}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>}
      <Field l="العنوان *"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field l="التفاصيل"><input value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      <Field l="صورة (اختياري)"><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field></div>
      <div className="mut">يُسجَّل موقعك تلقائيًا إن سمحت للمتصفح.</div>
      <div className="actions"><button className="btn" onClick={submit} disabled={busy}>{busy ? "جارٍ الإرسال..." : "إرسال ✓"}</button></div></div>
    <div className="card scroll"><h2>التقارير</h2><table><thead><tr><th>الموظف</th><th>العنوان</th><th>التفاصيل</th><th>الموقع</th><th>الصورة</th><th>التاريخ</th></tr></thead><tbody>
      {[...(d.field_reports || [])].reverse().map((r) => <tr key={r.id}><td>{emp(r.employee_id)}</td><td>{r.title}</td><td>{r.body}</td>
        <td>{r.lat != null ? <a className="ok" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">الخريطة</a> : "—"}</td>
        <td>{r.photo_path ? <button className="btn sm" onClick={() => open(r.photo_path)}>فتح</button> : "—"}</td><td>{(r.created_at || "").slice(0, 10)}</td></tr>)}
      {!(d.field_reports || []).length && <tr><td colSpan={6} className="mut">لا توجد تقارير</td></tr>}</tbody></table></div></>);
}

// المستخدمون وصلاحيات الوحدات (لمدير النظام)
export function UsersAdmin() {
  const { d, reload, emp } = useData();
  const [edit, setEdit] = useState<string | null>(null), [role, setRole] = useState("employee"), [mods, setMods] = useState<string[]>([]), [msg, setMsg] = useState("");
  const { MODULES } = require("./registry") as typeof import("./registry");
  const profiles = d.profiles || [];
  function start(p: Row) { setEdit(p.id); setRole(p.role); setMods(p.module_access || []); setMsg(""); }
  async function save(p: Row, all: boolean) {
    const { data, error } = await sb.rpc("awtad_update_profile", { p_user: p.id, p_role: role, p_modules: all ? null : mods });
    if (error) return setMsg(error.message); setMsg(data || ""); setEdit(null); await reload();
  }
  return (<>
    <div className="card"><h2>المستخدمون والصلاحيات</h2><div className="mut">اختر الدور، ويمكنك تقييد الوحدات الظاهرة لمستخدم معيّن. تقييد الوحدات يخفيها من الواجهة، أما حماية البيانات نفسها فتحكمها الأدوار في قاعدة البيانات. لإضافة مستخدم جديد: يُنشئ حسابه من شاشة الدخول ثم تربطه من صفحة الموظفين.</div>{msg && <div className="ok">{msg}</div>}</div>
    <div className="card scroll"><table><thead><tr><th>المستخدم</th><th>البريد</th><th>الدور</th><th>الموظف</th><th>الوحدات</th><th /></tr></thead><tbody>
      {profiles.map((p) => <tr key={p.id}><td>{p.full_name || "—"}</td><td>{p.email || "—"}</td><td>{p.role}</td><td>{p.employee_id ? emp(p.employee_id) : "—"}</td><td>{p.module_access ? `${p.module_access.length} وحدة` : "الكل حسب الدور"}</td>
        <td><button className="btn sm" onClick={() => start(p)}>تعديل</button></td></tr>)}</tbody></table></div>
    {edit && <div className="card"><h2>تعديل الصلاحيات</h2><div className="row"><Field l="الدور"><select value={role} onChange={(e) => setRole(e.target.value)}>{["admin", "hr", "manager", "employee", "accountant"].map((r) => <option key={r}>{r}</option>)}</select></Field></div>
      <h2 style={{ marginTop: 14 }}>الوحدات المسموحة</h2><div className="modgrid">{MODULES.map((m) => <label key={m.key} className="chk"><input type="checkbox" checked={mods.includes(m.key)} onChange={(e) => setMods(e.target.checked ? [...mods, m.key] : mods.filter((k) => k !== m.key))} />{m.title}</label>)}</div>
      <div className="actions"><button className="btn" onClick={() => save(profiles.find((p) => p.id === edit)!, false)}>حفظ الوحدات المحددة</button><button className="btn soft" onClick={() => save(profiles.find((p) => p.id === edit)!, true)}>حفظ بكل الوحدات حسب الدور</button><button className="btn cancel" onClick={() => setEdit(null)}>إلغاء ✕</button></div></div>}</>);
}


// اقتراح سياسات إجازات نظامية للمراجعة
export function SeedLeave() {
  const { d, reload } = useData();
  const [msg, setMsg] = useState("");
  const S: [string, number, number, string][] = [["سنوية", 21, 100, "تزداد إلى 30 بعد خمس سنوات"], ["زواج", 5, 100, ""], ["وفاة", 5, 100, ""], ["مولود", 3, 100, ""], ["أمومة", 70, 100, "10 أسابيع"], ["حج", 10, 100, "مرة واحدة بعد مدة خدمة محددة"], ["عدة", 130, 100, "وفاة الزوج للمسلمة"], ["مرضية", 120, 100, "30 بأجر كامل ثم 60 بـ75% ثم 30 دون أجر"]];
  async function seed() {
    const have = new Set((d.leave_policies || []).map((p) => p.kind)); let k = 0;
    try { for (const [kind, days, pct, note] of S) if (!have.has(kind)) { await ins("leave_policies", { kind, days, paid_pct: pct, note }); k++; } setMsg(`أُضيفت ${k} سياسة`); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<div className="card"><h2>سياسات مقترحة</h2><div className="mut">قيم عامة مقترحة للإجازات النظامية. راجعها مع النظام ولائحته التنفيذية وعدّلها قبل الاعتماد. عند وجود سياسة لنوع إجازة يُمنع طلب يتجاوز رصيدها السنوي.</div>
    <p><button className="btn" onClick={seed}>إضافة السياسات المقترحة الناقصة</button></p>{msg && <div className="ok">{msg}</div>}</div>);
}


// تقرير الحضور الشهري وتخطيط القوى العاملة
export function AttendanceReport() {
  const { d, set } = useData();
  const [ym, setYm] = useState(today().slice(0, 7)), [rows, setRows] = useState<Row[]>([]), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    let off = false; setBusy(true);
    sb.from(T("attendance")).select("*").gte("day", ym + "-01").lte("day", ym + "-31").then(({ data, error }) => { if (off) return; setBusy(false); if (error) setErr(error.message); else { setErr(""); setRows(data || []); } });
    return () => { off = true; };
  }, [ym]);
  const emps = (d.employees || []).filter((x) => x.active !== false);
  const end = ym === today().slice(0, 7) ? today() : ym + "-31";
  const days: string[] = []; for (let i = 1; i <= 31; i++) { const dd = `${ym}-${String(i).padStart(2, "0")}`; if (new Date(dd).getMonth() + 1 !== +ym.slice(5)) break; if (dd <= end) days.push(dd); }
  const hol = new Set((d.holidays || []).map((h) => h.day));
  const work = days.filter((x) => ![5, 6].includes(dayOfWeek(x)) && !hol.has(x));
  const stat = emps.map((e) => {
    const mine = rows.filter((r) => r.employee_id === e.id), byDay = Object.fromEntries(mine.map((r) => [r.day, r]));
    const leave = new Set<string>(); (d.leaves || []).filter((l) => l.employee_id === e.id && l.status === "معتمدة").forEach((l) => work.forEach((x) => { if (l.from_date <= x && x <= l.to_date) leave.add(x); }));
    let present = 0, late = 0, excused = 0, absent = 0, hrs = 0, extra = 0, incomplete = 0;
    work.forEach((x) => { const r = byDay[x];
      if (r?.check_in) { present++; if (String(r.check_in).slice(0, 5) > lateAfter(d, set.shift, e.id, x)) late++; if (!r.check_out && x < today()) incomplete++; if (r.check_out) { const h = (+new Date(`${x}T${r.check_out}`) - +new Date(`${x}T${r.check_in}`)) / 36e5; hrs += h; extra += Math.max(0, h - requiredHours(d, e.id, x)); } }
      else if (r?.excused) excused++; else if (!leave.has(x)) absent++; });
    return { e, present, late, excused, leaveDays: leave.size, absent, hrs, extra, incomplete };
  });
  const byDept: Record<string, { n: number; present: number; absent: number }> = {};
  stat.forEach((s) => { const k = s.e.dept || "غير محدد"; const o = (byDept[k] = byDept[k] || { n: 0, present: 0, absent: 0 }); o.n++; o.present += s.present; o.absent += s.absent; });
  function csv() {
    const R = [["الموظف", "القسم", "أيام الحضور", "مرات التأخير", "إجازة", "معذور", "غياب", "ساعات العمل", "ساعات إضافية محتملة", "ورديات ناقصة"], ...stat.map((s) => [s.e.name, s.e.dept, s.present, s.late, s.leaveDays, s.excused, s.absent, s.hrs.toFixed(1), s.extra.toFixed(1), s.incomplete])];
    dl(`awtad-attendance-${ym}.csv`, R);
  }
  return (<>
    <div className="card"><h2>تقرير الحضور الشهري</h2><div className="row"><Field l="الشهر"><input type="month" value={ym} onChange={(e) => setYm(e.target.value)} /></Field><button className="btn" onClick={csv}>تنزيل CSV</button></div>
      <div className="mut">أيام العمل المحتسبة {work.length} (الجمعة والسبت عطلة افتراضيًا، وتُستثنى العطلات الرسمية). الغياب = يوم عمل بلا تسجيل ولا إجازة معتمدة ولا عذر. الوردية الناقصة = دخول بلا خروج (تحتاج طلب تصحيح).{busy ? " جارٍ التحميل..." : ""}</div>{err && <div className="er">{err}</div>}</div>
    <div className="card scroll"><table><thead><tr><th>الموظف</th><th>القسم</th><th>الحضور</th><th>التأخير</th><th>إجازة</th><th>معذور</th><th>غياب</th><th>ساعات العمل</th><th>إضافي محتمل</th><th>ناقصة</th></tr></thead><tbody>
      {stat.map((s) => <tr key={s.e.id}><td>{s.e.name}</td><td>{s.e.dept}</td><td>{s.present}</td><td className={s.late ? "wa" : ""}>{s.late}</td><td>{s.leaveDays}</td><td>{s.excused}</td><td className={s.absent ? "er" : ""}>{s.absent}</td><td>{s.hrs.toFixed(1)}</td><td>{s.extra.toFixed(1)}</td><td className={s.incomplete ? "wa" : ""}>{s.incomplete}</td></tr>)}</tbody></table></div>
    <div className="card scroll"><h2>ملخص الأقسام (تخطيط القوى العاملة)</h2><table><thead><tr><th>القسم</th><th>الموظفون</th><th>أيام الحضور</th><th>أيام الغياب</th><th>نسبة الالتزام</th></tr></thead><tbody>
      {Object.entries(byDept).map(([k, v]) => { const tot = v.n * work.length; return <tr key={k}><td>{k}</td><td>{v.n}</td><td>{v.present}</td><td>{v.absent}</td><td>{tot ? Math.round((v.present / tot) * 100) + "%" : "—"}</td></tr>; })}</tbody></table></div></>);
}

// قالب عقد عمل (نموذج داخلي يُراجَع قانونيًا)
export function ContractTemplate() {
  const { d, reload } = useData();
  const [id, setId] = useState(""), [msg, setMsg] = useState("");
  async function make() {
    const e = (d.employees || []).find((x) => String(x.id) === (id || String(d.employees?.[0]?.id)));
    if (!e) return setMsg("أضف موظفًا أولًا");
    const body = `عقد عمل\nبين المنشأة (الطرف الأول) والسيد/ة ${e.name} (الطرف الثاني)، الهوية/الإقامة: ${e.national_id || "........"}، الجنسية: ${e.nationality || "........"}.\n1. الوظيفة: ${e.job || "........"} — القسم: ${e.dept || "........"}.\n2. تاريخ المباشرة: ${e.join_date || "........"}.\n3. الأجر: أساسي ${n(e.basic)} + سكن ${n(e.house)} + نقل ${n(e.trans)} + أخرى ${n(e.other)} = ${n(gross(e))} ريال شهريًا.\n4. فترة التجربة: حتى ${e.probation_end || "........"}.\n5. ساعات العمل والإجازات: وفق نظام العمل ولائحته التنفيذية.\n6. تُوثَّق هذه العلاقة التعاقدية في منصة قوى وفق المتطلبات النظامية.\nالتوقيع: الطرف الأول ........   الطرف الثاني ........`;
    try { await ins("contracts", { employee_id: e.id, title: "عقد عمل — " + e.name, body }); setMsg("أُنشئت مسودة العقد"); await reload(); } catch (x: any) { setMsg(x.message); }
  }
  return (<div className="card"><h2>إنشاء مسودة عقد من بيانات الموظف</h2><div className="row"><Field l="الموظف"><select value={id || String(d.employees?.[0]?.id ?? "")} onChange={(e) => setId(e.target.value)}>{(d.employees || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><button className="btn" onClick={make}>إنشاء المسودة</button></div>
    {msg && <div className="ok">{msg}</div>}<div className="mut">نموذج داخلي للموافقة الإلكترونية بكتابة الاسم، ولا يغني عن توثيق العقد في منصة قوى ولا عن مراجعته قانونيًا.</div></div>);
}


// قالب مهام الخروج
const EXIT = ["تسليم العهد والأصول", "إغلاق الحسابات والصلاحيات", "المخالصة المالية ومكافأة نهاية الخدمة", "مقابلة الخروج", "إصدار شهادة الخبرة", "إنهاء التأمينات والإقامة"];
export function ExitTemplate() {
  const { d, reload } = useData();
  const [id, setId] = useState(""), [msg, setMsg] = useState("");
  async function make() {
    const eid = +(id || d.employees?.[0]?.id); if (!eid) return setMsg("أضف موظفًا أولًا");
    try { for (const t of EXIT) await ins("exit_tasks", { employee_id: eid, title: t }); setMsg(`أُنشئت ${EXIT.length} مهام`); await reload(); } catch (e: any) { setMsg(e.message); }
  }
  return (<div className="card"><h2>قالب إجراءات الخروج</h2><div className="row"><Field l="الموظف"><select value={id} onChange={(e) => setId(e.target.value)}>{(d.employees || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field><button className="btn" onClick={make}>إنشاء {EXIT.length} مهام</button></div>{msg && <div className="ok">{msg}</div>}</div>);
}
