// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, ins, del } from "@/awtad/lib/supabase";
import { Row, gross, hijri, loanDue, n, otFor, payRow, reimbFor, today } from "@/awtad/lib/calc";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
const monthName = () => new Date().toLocaleDateString("ar-SA", { month: "long", year: "numeric" });

// كشف الراتب القابل للطباعة
export function Payslip({ emp, ot, ab = 0 }: { emp: Row; ot?: number; ab?: number }) {
  const { d, set } = useData();
  const ym = today().slice(0, 7);
  const r = payRow(emp, set, ot ?? otFor(d.requests || [], emp.id, ym), ab, loanDue(d.loans || [], emp.id, ym), reimbFor(d.expenses || [], emp.id));
  const E: [string, number][] = [["الراتب الأساسي", +emp.basic || 0], ["بدل السكن", +emp.house || 0], ["بدل النقل", +emp.trans || 0], ["بدلات أخرى", +emp.other || 0], ["أجر العمل الإضافي", r.otp], ["تعويض مصروفات", r.reimb]];
  const D: [string, number][] = [["خصم الغياب", r.abd], ["التأمينات الاجتماعية (حصة الموظف)", r.ge], ["قسط السلفة", r.loan]];
  return (
    <div className="card payslip">
      <div className="noprint" style={{ textAlign: "end" }}><button className="btn" onClick={() => window.print()}>طباعة / حفظ PDF</button></div>
      <h2>كشف راتب — {monthName()}</h2>
      <div className="fgrid"><div><span className="mut">الموظف</span><div><b>{emp.name}</b></div></div><div><span className="mut">المسمى</span><div>{emp.job || "—"}</div></div><div><span className="mut">القسم</span><div>{emp.dept || "—"}</div></div><div><span className="mut">تاريخ الإصدار</span><div>{today()}</div></div><div><span className="mut">التاريخ الهجري</span><div>{hijri()}</div></div></div>
      <div className="two">
        <div><h2>المستحقات</h2><table><tbody>{E.map(([l, v]) => <tr key={l}><td>{l}</td><td>{n(v)}</td></tr>)}<tr><th>الإجمالي</th><th>{n(r.g + r.otp + r.reimb)}</th></tr></tbody></table></div>
        <div><h2>الاستقطاعات</h2><table><tbody>{D.map(([l, v]) => <tr key={l}><td>{l}</td><td>{n(v)}</td></tr>)}<tr><th>الإجمالي</th><th>{n(r.abd + r.ge + r.loan)}</th></tr></tbody></table></div>
      </div>
      <div className="netbox">صافي الراتب: <b>{n(r.net)} ر.س</b></div>
    </div>
  );
}

// كشوف الرواتب (للمدير والموارد البشرية)
export function Payslips() {
  const { d } = useData();
  const [id, setId] = useState(""), [ot, setOt] = useState<number | undefined>(undefined), [ab, setAb] = useState(0);
  const emps = d.employees || [], emp = emps.find((x) => String(x.id) === (id || String(emps[0]?.id)));
  return (<>
    <div className="card noprint"><h2>كشف راتب موظف</h2><div className="row">
      <Field l="الموظف"><select value={id || String(emps[0]?.id ?? "")} onChange={(e) => setId(e.target.value)}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field l="ساعات إضافي"><input type="number" min={0} placeholder="تلقائي" value={ot ?? ""} onChange={(e) => setOt(e.target.value === "" ? undefined : +e.target.value)} /></Field>
      <Field l="أيام غياب"><input type="number" min={0} value={ab} onChange={(e) => setAb(+e.target.value)} /></Field></div></div>
    {emp ? <Payslip emp={emp} ot={ot} ab={ab} /> : <div className="card mut">أضف موظفين أولًا.</div>}</>);
}

// بوابتي: بيانات الموظف الحالي
export function MyPortal() {
  const { d } = useData();
  const { user } = useAuth();
  const emp = (d.employees || []).find((x) => x.id === user?.employeeId);
  if (!emp) return <div className="card"><h2>بوابتي</h2><div className="mut">حسابك غير مرتبط بسجل موظف. اطلب من مدير النظام ربط حسابك من صفحة الموظفين (زر «ربط حساب»).</div></div>;
  const q = emp.join_date && (Date.now() - +new Date(emp.join_date)) / 31557600000 >= 5 ? 30 : 21;
  const used = (d.leaves || []).filter((l) => l.employee_id === emp.id && l.type === "سنوية" && l.status === "معتمدة").reduce((a, l) => a + l.days, 0);
  const myLeaves = (d.leaves || []).filter((l) => l.employee_id === emp.id).slice(0, 6);
  const docs = (d.documents || []).filter((x) => x.employee_id === emp.id);
  return (<>
    <div className="card"><h2>مرحبًا {emp.name}</h2><div className="fgrid">
      {[["المسمى", emp.job], ["القسم", emp.dept], ["تاريخ المباشرة", emp.join_date], ["رصيد الإجازة السنوية", `${q - used} يوم`], ["إجمالي الراتب", n(gross(emp)) + " ر.س"]].map(([l, v]) => <div key={l}><span className="mut">{l}</span><div><b>{v || "—"}</b></div></div>)}</div></div>
    <div className="card"><h2>بياناتي الكاملة</h2><div className="fgrid">{([["رقم الهوية/الإقامة", emp.national_id], ["الجنسية", emp.nationality], ["تاريخ الميلاد", emp.birth_date], ["الجنس", emp.gender], ["الحالة الاجتماعية", emp.marital_status], ["المؤهل", emp.education], ["البريد", emp.email], ["الجوال", emp.phone], ["العنوان", emp.address], ["جهة الطوارئ", [emp.emergency_name, emp.emergency_phone].filter(Boolean).join(" — ")], ["نهاية العقد", emp.contract_end], ["انتهاء الإقامة", emp.iqama_expiry], ["رخصة العمل", emp.work_permit_expiry], ["التأمين الطبي", emp.health_insurance_expiry], ["الجواز", emp.passport_expiry], ["الآيبان", emp.iban]] as [string, any][]).map(([l, v]) => <div key={l}><span className="mut">{l}</span><div dir="auto"><b>{v || "—"}</b></div></div>)}</div><div className="mut" style={{ marginTop: 8 }}>لتصحيح أي بيان قدّم «تحديث بيانات» من الطلبات الإدارية.</div></div>
    <div className="card scroll"><h2>آخر إجازاتي</h2><table><thead><tr><th>النوع</th><th>الفترة</th><th>الأيام</th><th>الحالة</th></tr></thead><tbody>
      {myLeaves.map((l) => <tr key={l.id}><td>{l.type}</td><td>{l.from_date} → {l.to_date}</td><td>{l.days}</td><td>{l.status}</td></tr>)}{!myLeaves.length && <tr><td colSpan={4} className="mut">لا توجد إجازات</td></tr>}</tbody></table></div>
    <div className="card"><h2>مستنداتي</h2>{docs.length ? docs.map((x) => <DocRow key={x.id} doc={x} canDelete={false} />) : <div className="mut">لا توجد مستندات</div>}</div>
    <MyContracts emp={emp} />
    <ChangePassword />
    <MyVerifications emp={emp} />
    <Payslip emp={emp} /></>);
}

async function openDoc(path: string) {
  const { data, error } = await sb.storage.from("awtad-docs").createSignedUrl(path, 60);
  if (error || !data) return alert(error?.message || "تعذّر فتح الملف");
  window.open(data.signedUrl, "_blank");
}
function DocRow({ doc, canDelete, onDeleted }: { doc: Row; canDelete: boolean; onDeleted?: () => void }) {
  return (
    <div className="docrow"><div><b>{doc.title}</b> <span className="chip">{doc.kind}</span>{doc.expires_on && <span className={"chip " + (doc.expires_on < today() ? "er" : "")}>ينتهي {doc.expires_on}</span>}</div>
      <div><button className="btn sm" onClick={() => openDoc(doc.path)}>فتح</button>
        {canDelete && <button className="btn sm dng" onClick={async () => { if (!confirm("حذف المستند؟")) return; await sb.storage.from("awtad-docs").remove([doc.path]); await del("documents", doc.id); onDeleted?.(); }}>حذف</button>}</div></div>
  );
}

// مستندات الموظفين (رفع وعرض)
export function Documents() {
  const { d, reload, emp } = useData();
  const { user } = useAuth();
  const canUp = ["admin", "hr"].includes(user?.role || "");
  const emps = d.employees || [];
  const [eid, setEid] = useState(""), [title, setTitle] = useState(""), [kind, setKind] = useState("عقد"), [exp, setExp] = useState(""), [file, setFile] = useState<File | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function upload() {
    const id = eid || String(emps[0]?.id || "");
    if (!id || !file || !title.trim()) return setMsg("اختر الموظف وأدخل العنوان واختر ملفًا");
    if (file.size > 10 * 1024 * 1024) return setMsg("الحد الأقصى لحجم الملف 10 ميغابايت");
    setBusy(true); setMsg("");
    try {
      const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
      const path = `${user!.orgId}/${id}/${Date.now()}.${ext}`;
      const up = await sb.storage.from("awtad-docs").upload(path, file, { contentType: file.type || undefined });
      if (up.error) throw new Error(up.error.message);
      await ins("documents", { employee_id: +id, title: title.trim(), kind, path, expires_on: exp || null });
      setTitle(""); setExp(""); setFile(null); await reload();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  return (<>
    {canUp && <div className="card"><h2>رفع مستند</h2>{msg && <div className="er">{msg}</div>}<div className="fgrid">
      <Field l="الموظف"><select value={eid || String(emps[0]?.id ?? "")} onChange={(e) => setEid(e.target.value)}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
      <Field l="عنوان المستند *"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field l="النوع"><select value={kind} onChange={(e) => setKind(e.target.value)}>{["عقد", "إقامة", "هوية", "شهادة", "رخصة", "أخرى"].map((k) => <option key={k}>{k}</option>)}</select></Field>
      <Field l="تاريخ الانتهاء"><input type="date" value={exp} onChange={(e) => setExp(e.target.value)} /></Field>
      <Field l="الملف (حتى 10 ميغابايت) *"><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field></div>
      <div className="actions"><button className="btn" onClick={upload} disabled={busy}>{busy ? "جارٍ الرفع..." : "رفع ✓"}</button></div></div>}
    <div className="card"><h2>المستندات</h2>{(d.documents || []).length ? (d.documents || []).map((x) => <div key={x.id}><span className="mut">{emp(x.employee_id)}</span><DocRow doc={x} canDelete={canUp} onDeleted={reload} /></div>) : <div className="mut">لا توجد مستندات</div>}</div></>);
}

// ردّ الموظف على طلبات التحقق من الموقع
function MyVerifications({ emp }: { emp: Row }) {
  const { d, reload } = useData();
  const [msg, setMsg] = useState("");
  const pend = (d.verifications || []).filter((v) => v.employee_id === emp.id && v.status === "بانتظار الرد");
  if (!pend.length) return null;
  async function answer(v: Row) {
    try {
      const pos: GeolocationPosition = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 12000 }));
      const c = prompt("تعليق (اختياري)") || null;
      const { error } = await sb.from("awtad_verifications").update({ status: "تم الرد", lat: pos.coords.latitude, lng: pos.coords.longitude, comment: c, answered_at: new Date().toISOString() }).eq("id", v.id);
      if (error) throw new Error(error.message); setMsg(""); await reload();
    } catch (e: any) { setMsg(e?.code === 1 ? "لم يُسمح بالوصول إلى الموقع" : "تعذّر الرد: " + (e?.message || "")); }
  }
  return (<div className="card"><h2>طلبات تحقق من موقعك</h2>{msg && <div className="er">{msg}</div>}{pend.map((v) => <div className="docrow" key={v.id}><div><b>{v.title}</b></div><button className="btn" onClick={() => answer(v)}>إرسال موقعي</button></div>)}</div>);
}

// عقودي: توقيع إلكتروني داخلي بكتابة الاسم
function MyContracts({ emp }: { emp: Row }) {
  const { d, reload } = useData();
  const [name, setName] = useState(""), [msg, setMsg] = useState("");
  const mine = (d.contracts || []).filter((c) => c.employee_id === emp.id && c.status !== "مسودة");
  if (!mine.length) return null;
  async function sign(c: Row) { const { data, error } = await sb.rpc("awtad_sign_contract", { p_id: c.id, p_name: name }); if (error) return setMsg(error.message); setMsg(data || ""); setName(""); await reload(); }
  return (<div className="card"><h2>عقودي</h2>{msg && <div className="ok">{msg}</div>}{mine.map((c) => (
    <div key={c.id} style={{ marginBottom: 14 }}><b>{c.title}</b> <span className="chip">{c.status}</span><pre className="tpl">{c.body}</pre>
      {c.status === "أُرسل" ? <div className="row"><Field l="اكتب اسمك الكامل للتوقيع"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><button className="btn" onClick={() => sign(c)}>أوافق وأوقّع</button></div> : <div className="mut">وقّعه {c.signed_name} في {(c.signed_at || "").slice(0, 10)}</div>}</div>))}</div>);
}

// تغيير كلمة السر من الموظف نفسه
function ChangePassword() {
  const [a, setA] = useState(""), [b, setB] = useState(""), [msg, setMsg] = useState(""), [ok, setOk] = useState(true);
  async function go() { if (a.length < 8) { setOk(false); return setMsg("8 أحرف على الأقل"); } if (a !== b) { setOk(false); return setMsg("كلمتا السر غير متطابقتين"); } const { error } = await sb.auth.updateUser({ password: a }); setOk(!error); setMsg(error ? error.message : "تم تغيير كلمة السر"); if (!error) { setA(""); setB(""); } }
  return (<div className="card"><h2>تغيير كلمة السر</h2><div className="row"><label className="fld"><span>كلمة السر الجديدة</span><input type="password" value={a} onChange={(e) => setA(e.target.value)} autoComplete="new-password" /></label><label className="fld"><span>تأكيدها</span><input type="password" value={b} onChange={(e) => setB(e.target.value)} autoComplete="new-password" /></label><button className="btn" onClick={go}>تغيير</button></div>{msg && <div className={ok ? "ok" : "er"}>{msg}</div>}</div>);
}
