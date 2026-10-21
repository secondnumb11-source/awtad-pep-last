// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useEffect, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { sb, T, getOrg, ins, del, upd } from "@/awtad/lib/supabase";
import { Row, addDays, today } from "@/awtad/lib/calc";
import { printPdf } from "@/awtad/lib/export";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
async function upload(file: File, folder: string) {
  const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6), path = `${getOrg()}/company/${folder}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("awtad-docs").upload(path, file, { contentType: file.type || undefined }); if (error) throw new Error(error.message); return path;
}
async function openFile(path: string) { const { data, error } = await sb.storage.from("awtad-docs").createSignedUrl(path, 60); if (error || !data) return alert(error?.message || "تعذّر الفتح"); window.open(data.signedUrl, "_blank"); }

// ===== ملف الشركة والترويسة (يظهر في كل ملف يصدره النظام) =====
export function CompanyProfile() {
  const { company, logoUrl, reload } = useData();
  const [f, setF] = useState<Row>({ brand_color: "#0a6cc2" }), [logo, setLogo] = useState<File | null>(null), [msg, setMsg] = useState(""), [ok, setOk] = useState(true);
  useEffect(() => { if (company) setF(company); }, [company]);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });
  async function save() {
    try {
      let path = f.logo_path || null; if (logo) { if (logo.size > 2 * 1024 * 1024) throw new Error("حجم الشعار يتجاوز 2 ميغابايت"); path = await upload(logo, "logo"); }
      const row = { org_id: getOrg(), name_ar: f.name_ar || null, name_en: f.name_en || null, cr_number: f.cr_number || null, vat_number: f.vat_number || null, unified_no: f.unified_no || null, address: f.address || null, city: f.city || null, phone: f.phone || null, email: f.email || null, website: f.website || null, header_note: f.header_note || null, footer_note: f.footer_note || null, brand_color: f.brand_color || "#0a6cc2", logo_path: path, updated_at: new Date().toISOString() };
      const { error } = await sb.from(T("company_profile")).upsert(row, { onConflict: "org_id" }); if (error) throw new Error(error.message);
      setOk(true); setMsg("حُفظت الترويسة وستظهر في كل ملف Excel وPDF يصدره النظام"); setLogo(null); await reload();
    } catch (e: any) { setOk(false); setMsg(e.message); }
  }
  const inp = (k: string, l: string, ltr = false) => <Field l={l}><input dir={ltr ? "ltr" : undefined} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} /></Field>;
  return (<>
    <div className="card"><h2>ملف الشركة والترويسة</h2><div className="mut">هذه البيانات هي التي تظهر في ترويسة جميع التقارير وكشوف الرواتب والقيود المصدَّرة (PDF وExcel).</div>{msg && <div className={ok ? "ok" : "er"}>{msg}</div>}
      <div className="fgrid" style={{ marginTop: 12 }}>{inp("name_ar", "اسم الشركة (عربي)")}{inp("name_en", "اسم الشركة (إنجليزي)", true)}{inp("cr_number", "رقم السجل التجاري", true)}{inp("vat_number", "الرقم الضريبي", true)}{inp("unified_no", "الرقم الموحد (700)", true)}{inp("address", "العنوان")}{inp("city", "المدينة")}{inp("phone", "الهاتف", true)}{inp("email", "البريد", true)}{inp("website", "الموقع", true)}{inp("header_note", "ملاحظة أسفل الترويسة")}{inp("footer_note", "نص التذييل")}
        <Field l="لون الهوية"><input type="color" value={f.brand_color || "#0a6cc2"} onChange={(e) => set("brand_color", e.target.value)} style={{ height: 44 }} /></Field>
        <Field l="الشعار (PNG أو JPG حتى 2 ميغابايت)"><input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} /></Field></div>
      <div className="actions"><button className="btn" onClick={save}>حفظ ✓</button><button className="btn soft" onClick={() => printPdf({ title: "معاينة الترويسة", subtitle: "نموذج لعرض شكل الملفات المصدَّرة", head: ["البند", "القيمة", "ملاحظة"], rows: [["مثال 1", "1,000.00", "—"], ["مثال 2", "2,500.00", "—"]], company: { ...f }, logoUrl: logo ? URL.createObjectURL(logo) : logoUrl, totals: ["الإجمالي", "3,500.00", ""] })}>معاينة PDF</button></div></div>
    <div className="card"><h2>المعاينة المباشرة</h2><div style={{ borderBottom: `3px solid ${f.brand_color || "#0a6cc2"}`, paddingBottom: 12, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>{(logo || logoUrl) && <img src={logo ? URL.createObjectURL(logo) : logoUrl} alt="" style={{ maxHeight: 64, maxWidth: 150 }} />}<div><b style={{ fontSize: 19, color: f.brand_color }}>{f.name_ar || "اسم الشركة"}</b><div className="mut" dir="ltr">{f.name_en}</div></div></div>
      <div className="mut" style={{ lineHeight: 1.8 }}>{f.cr_number && <div>السجل التجاري: {f.cr_number}</div>}{f.vat_number && <div>الرقم الضريبي: {f.vat_number}</div>}{(f.address || f.city) && <div>{[f.address, f.city].filter(Boolean).join("، ")}</div>}{f.phone && <div>هاتف: {f.phone}</div>}</div></div></div></>);
}

// ===== مستندات الشركة =====
const KINDS = ["السجل التجاري", "رخصة البلدية", "شهادة الزكاة والضريبة", "شهادة التأمينات الاجتماعية", "شهادة السعودة (نطاقات)", "اشتراك قوى", "اشتراك مدد", "اشتراك مقيم", "التأمين الطبي للمنشأة", "عضوية الغرفة التجارية", "عقد الإيجار", "رخصة الدفاع المدني", "شهادة الآيزو", "أخرى"];
export function CompanyDocs() {
  const { d, reload } = useData(); const t = today();
  const [f, setF] = useState<Row>({ kind: KINDS[0], notify_days: 60 }), [file, setFile] = useState<File | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  async function add() {
    if (!f.title?.trim()) return setMsg("العنوان مطلوب"); setBusy(true);
    try { const path = file ? await upload(file, "doc") : null; await ins("company_docs", { kind: f.kind, title: f.title.trim(), number: f.number || null, issuer: f.issuer || null, issue_date: f.issue_date || null, expiry_date: f.expiry_date || null, notify_days: +f.notify_days || 60, notes: f.notes || null, file_path: path }); setF({ kind: KINDS[0], notify_days: 60 }); setFile(null); setMsg(""); await reload(); }
    catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  const rows = [...(d.company_docs || [])].sort((a, b) => String(a.expiry_date || "9").localeCompare(String(b.expiry_date || "9")));
  return (<>
    <div className="card"><h2>إضافة مستند للشركة</h2>{msg && <div className="er">{msg}</div>}<div className="fgrid">
      <Field l="النوع"><select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
      <Field l="العنوان *"><input value={f.title || ""} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field><Field l="الرقم"><input dir="ltr" value={f.number || ""} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
      <Field l="الجهة المصدرة"><input value={f.issuer || ""} onChange={(e) => setF({ ...f, issuer: e.target.value })} /></Field><Field l="تاريخ الإصدار"><input type="date" value={f.issue_date || ""} onChange={(e) => setF({ ...f, issue_date: e.target.value })} /></Field>
      <Field l="تاريخ الانتهاء"><input type="date" value={f.expiry_date || ""} onChange={(e) => setF({ ...f, expiry_date: e.target.value })} /></Field><Field l="التنبيه قبل (يوم)"><input type="number" value={f.notify_days} onChange={(e) => setF({ ...f, notify_days: e.target.value })} /></Field>
      <Field l="ملاحظات"><input value={f.notes || ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field><Field l="الملف (اختياري)"><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /></Field></div>
      <div className="actions"><button className="btn" onClick={add} disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ ✓"}</button></div></div>
    <div className="card scroll"><table><thead><tr><th>النوع</th><th>العنوان</th><th>الرقم</th><th>الجهة</th><th>الانتهاء</th><th>الحالة</th><th /></tr></thead><tbody>
      {rows.map((x) => { const days = x.expiry_date ? Math.round((+new Date(x.expiry_date) - +new Date(t)) / 864e5) : null; return <tr key={x.id}><td>{x.kind}</td><td>{x.title}</td><td dir="ltr">{x.number}</td><td>{x.issuer}</td><td>{x.expiry_date || "—"}</td>
        <td className={days == null ? "mut" : days < 0 ? "er" : days <= (x.notify_days || 60) ? "wa" : "ok"}>{days == null ? "بلا تاريخ" : days < 0 ? `منتهٍ منذ ${-days} يومًا` : days <= (x.notify_days || 60) ? `ينتهي بعد ${days} يومًا` : "ساري"}</td>
        <td>{x.file_path && <button className="btn sm" onClick={() => openFile(x.file_path)}>فتح الملف</button>}<button className="btn sm dng" onClick={async () => { if (!confirm("حذف المستند؟")) return; if (x.file_path) await sb.storage.from("awtad-docs").remove([x.file_path]); await del("company_docs", x.id); await reload(); }}>حذف</button></td></tr>; })}
      {!rows.length && <tr><td colSpan={7} className="mut">لا توجد مستندات. أضف السجل التجاري والرخص والشهادات ليذكّرك النظام بمواعيد تجديدها.</td></tr>}</tbody></table></div></>);
}

// ===== المواعيد والمهل الدورية =====
export function SeedDeadlines() {
  const { d, reload } = useData(); const [msg, setMsg] = useState("");
  const S: Row[] = [
    { title: "رفع ملف حماية الأجور (مدد)", category: "حماية الأجور", recurrence: "شهري", day_of_month: 10, notify_days: 5, notes: "الموعد المعتاد؛ تحقق من الموعد الرسمي الحالي" },
    { title: "سداد اشتراكات التأمينات الاجتماعية", category: "التأمينات", recurrence: "شهري", day_of_month: 15, notify_days: 7, notes: "تحقق من الموعد الرسمي الحالي" },
    { title: "إقرار ضريبة القيمة المضافة", category: "الضريبة", recurrence: "شهري", day_of_month: 28, notify_days: 7, notes: "حسب دورة تقديمك (شهري أو ربع سنوي)؛ عدّل الموعد" },
    { title: "مراجعة نسبة التوطين (نطاقات)", category: "نطاقات", recurrence: "شهري", day_of_month: 1, notify_days: 3, notes: "" },
    { title: "الإقرار الزكوي السنوي", category: "الزكاة", recurrence: "سنوي", month_of_year: 4, day_of_month: 30, notify_days: 30, notes: "يتوقف على نهاية سنتك المالية؛ تحقق من الموعد" }];
  async function seed() { const have = new Set((d.deadlines || []).map((x) => x.title)); let k = 0; try { for (const s of S) if (!have.has(s.title)) { await ins("deadlines", s); k++; } setMsg(`أُضيف ${k} موعدًا`); await reload(); } catch (e: any) { setMsg(e.message); } }
  return <div className="card"><h2>مواعيد مقترحة</h2><div className="mut">مواعيد دورية شائعة للمنشآت السعودية بقيم مبدئية. <b>تحقق من كل موعد مع الجهة المعنية قبل الاعتماد</b> وعدّله.</div><p><button className="btn" onClick={seed}>إضافة المواعيد المقترحة</button></p>{msg && <div className="ok">{msg}</div>}</div>;
}
export { upd, addDays };
