// @ts-nocheck -- ported from original project (looser TS settings)
import { useEffect, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, T, getOrg } from "@/awtad/lib/supabase";
import { callIntegration, sendMail } from "@/awtad/lib/mail";
import { Row, gross, payRow, today } from "@/awtad/lib/calc";

export const PROVIDERS: { k: string; name: string; ops: string[]; hint: string }[] = [
  { k: "resend", name: "البريد الإلكتروني (Resend)", ops: [], hint: "أنشئ مفتاحًا في resend.com وأضف نطاق الإرسال ثم أدخل عنوان المرسل المعتمد." },
  { k: "qiwa", name: "قوى", ops: ["رفع عقد", "تحقق من عقد"], hint: "تتطلب اعتمادًا رسميًا كمزوّد تكامل. أدخل عنوان الواجهة والمفتاح وفق توثيق قوى." },
  { k: "mudad", name: "مدد (حماية الأجور)", ops: ["رفع ملف أجور", "استعلام حالة الملف"], hint: "وفق توثيق مدد أو واجهة بنك المنشأة." },
  { k: "gosi", name: "التأمينات الاجتماعية", ops: ["تسجيل مشترك", "إرسال اشتراكات", "استعلام مشترك"], hint: "وفق توثيق واجهات التأمينات المعتمدة للمنشآت." },
  { k: "muqeem", name: "مقيم", ops: ["استعلام إقامة", "تجديد إقامة"], hint: "وفق توثيق واجهات مقيم." },
  { k: "absher", name: "أبشر أعمال", ops: ["استعلام"], hint: "وفق توثيق واجهات أبشر أعمال." },
  { k: "saned", name: "ساند", ops: ["استعلام استحقاق"], hint: "وفق توثيق ساند." },
  { k: "bank", name: "البنك (تحويل الرواتب)", ops: ["تحويل رواتب", "استعلام حالة"], hint: "وفق توثيق واجهة بنك المنشأة (API) وصيغة طلب التحويل." },
  { k: "ai", name: "الذكاء الاصطناعي (Claude) للتقارير", ops: [], hint: "مفتاح API من console.anthropic.com. يحوّل طلبك المكتوب إلى مواصفة تقرير؛ لا تُرسَل بيانات الموظفين، بل أسماء الأعمدة فقط." },
  { k: "whatsapp", name: "واتساب (Meta Cloud API)", ops: [], hint: "رمز الوصول ومعرّف رقم الهاتف من Meta for Developers. الرسائل المبادَرة من المنشأة تتطلب قالبًا معتمدًا؛ بدونه يُرسَل نص حر يصل فقط خلال 24 ساعة من آخر رسالة للموظف." },
  { k: "accounting", name: "النظام المحاسبي", ops: ["ترحيل قيد"], hint: "وفق توثيق نظامك المحاسبي (قيود، ERP)." },
];
type Op = { method: string; path: string; body_template: string; query_template: string };

// بيانات الموظف المستخدمة في قوالب الطلبات: {{name}} {{national_id}} {{gross}} ...
export function empData(e: Row, set: any): Record<string, any> {
  const r = payRow(e, set);
  return { ...e, gross: gross(e), net: +r.net.toFixed(2), ge: +r.ge.toFixed(2), gr: +r.gr.toFixed(2), period: today().slice(0, 7), date: today() };
}

export function useIntegrations() {
  const [rows, setRows] = useState<Row[]>([]);
  const load = async () => { const { data } = await sb.from(T("secrets")).select("provider,config,has_secret,updated_at"); setRows(data || []); };
  useEffect(() => { load(); }, []);
  return { rows, load };
}

function Card({ p, row, reload }: { p: (typeof PROVIDERS)[number]; row?: Row; reload: () => void }) {
  const { d, set } = useData();
  const { user } = useAuth();
  const c = row?.config || {};
  const [cfg, setCfg] = useState<Row>({ base_url: "", auth_type: "bearer", header_name: "", username: "", label: p.name, from: "", reply_to: "", ops: {}, ...c });
  const [secret, setSecret] = useState(""), [msg, setMsg] = useState(""), [ok, setOk] = useState(true), [newOp, setNewOp] = useState(p.ops[0] || "");
  const ops: Record<string, Op> = cfg.ops || {};
  const upd = (k: string, v: any) => setCfg({ ...cfg, [k]: v });
  const setOp = (name: string, patch: Partial<Op>) => setCfg({ ...cfg, ops: { ...ops, [name]: { method: "POST", path: "", body_template: "", query_template: "", ...ops[name], ...patch } } });

  async function save() {
    setMsg(""); const base = { org_id: getOrg(), provider: p.k, config: cfg, updated_at: new Date().toISOString() };
    const res = row ? await sb.from(T("secrets")).update(secret ? { config: cfg, secret, updated_at: base.updated_at } : { config: cfg, updated_at: base.updated_at }).eq("org_id", getOrg()).eq("provider", p.k)
      : await sb.from(T("secrets")).insert(secret ? { ...base, secret } : base);
    if (res.error) { setOk(false); setMsg(res.error.message); } else { setOk(true); setMsg("تم الحفظ"); setSecret(""); reload(); }
  }
  async function testMail() {
    const r = await sendMail(user!.email, "رسالة تجريبية من أوتاد", "<p>إعدادات البريد تعمل بنجاح ✓</p>");
    setOk(r.ok); setMsg(r.ok ? `أُرسلت رسالة تجريبية إلى ${user!.email}` : r.msg || "فشل الإرسال");
  }
  async function testOp(name: string) {
    const e = (d.employees || [])[0]; if (!e) { setOk(false); return setMsg("أضف موظفًا أولًا لاختبار العملية"); }
    const r = await callIntegration(p.k, name, empData(e, set), "اختبار");
    setOk(r.ok); setMsg(r.ok ? `نجحت (${r.status}): ${(r.body || "").slice(0, 200)}` : `${r.msg || "فشلت"} ${r.status ? "(" + r.status + ")" : ""} ${(r.body || "").slice(0, 200)}`);
  }
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}><h2 style={{ margin: 0 }}>{p.name}</h2><span className={row?.has_secret ? "ok" : "wa"}>{row?.has_secret ? "المفتاح محفوظ" : "غير مُعدّ"}</span></div>
      <div className="mut" style={{ margin: "6px 0 12px" }}>{p.hint}</div>
      <div className="fgrid">
        {p.k === "ai" ? (<label className="fld"><span>اسم النموذج (اختياري)</span><input dir="ltr" placeholder="claude-sonnet-5-5" value={cfg.model || ""} onChange={(e) => upd("model", e.target.value)} /></label>)
        : p.k === "whatsapp" ? (<>
          <label className="fld"><span>معرّف رقم الهاتف (Phone number ID)</span><input dir="ltr" value={cfg.phone_number_id || ""} onChange={(e) => upd("phone_number_id", e.target.value)} /></label>
          <label className="fld"><span>اسم القالب المعتمد (اختياري)</span><input dir="ltr" value={cfg.template || ""} onChange={(e) => upd("template", e.target.value)} /></label>
          <label className="fld"><span>لغة القالب</span><input dir="ltr" placeholder="ar" value={cfg.lang || ""} onChange={(e) => upd("lang", e.target.value)} /></label>
          <label className="fld"><span>إصدار الواجهة</span><input dir="ltr" placeholder="v21.0" value={cfg.api_version || ""} onChange={(e) => upd("api_version", e.target.value)} /></label></>)
        : p.k === "resend" ? (<>
          <label className="fld"><span>عنوان المرسل المعتمد</span><input dir="ltr" placeholder="أوتاد <noreply@yourdomain.com>" value={cfg.from} onChange={(e) => upd("from", e.target.value)} /></label>
          <label className="fld"><span>بريد الرد (اختياري)</span><input dir="ltr" value={cfg.reply_to} onChange={(e) => upd("reply_to", e.target.value)} /></label>
        </>) : (<>
          <label className="fld"><span>عنوان الواجهة (https)</span><input dir="ltr" placeholder="https://api.example.sa" value={cfg.base_url} onChange={(e) => upd("base_url", e.target.value)} /></label>
          <label className="fld"><span>طريقة المصادقة</span><select value={cfg.auth_type} onChange={(e) => upd("auth_type", e.target.value)}><option value="bearer">Bearer</option><option value="header">ترويسة مخصصة</option><option value="basic">Basic</option><option value="none">بدون</option></select></label>
          {cfg.auth_type === "header" && <label className="fld"><span>اسم الترويسة</span><input dir="ltr" placeholder="x-api-key" value={cfg.header_name} onChange={(e) => upd("header_name", e.target.value)} /></label>}
          {cfg.auth_type === "basic" && <label className="fld"><span>اسم المستخدم</span><input dir="ltr" value={cfg.username} onChange={(e) => upd("username", e.target.value)} /></label>}
        </>)}
        <label className="fld"><span>{["resend", "ai"].includes(p.k) ? "مفتاح API" : p.k === "whatsapp" ? "رمز الوصول (Access token)" : "المفتاح / السر"} (للكتابة فقط)</span><input type="password" dir="ltr" autoComplete="new-password" placeholder={row?.has_secret ? "محفوظ — اتركه فارغًا للإبقاء عليه" : "الصقه هنا"} value={secret} onChange={(e) => setSecret(e.target.value)} /></label>
      </div>
      {!["resend", "ai", "whatsapp"].includes(p.k) && (
        <div style={{ marginTop: 12 }}>
          <h2 style={{ fontSize: 14 }}>العمليات</h2>
          {Object.keys(ops).map((name) => (
            <div key={name} className="opbox">
              <div className="row" style={{ justifyContent: "space-between" }}><b>{name}</b><span><button className="btn sm" onClick={() => testOp(name)}>اختبار على أول موظف</button><button className="btn sm dng" onClick={() => { const o = { ...ops }; delete o[name]; upd("ops", o); }}>حذف</button></span></div>
              <div className="fgrid">
                <label className="fld"><span>الطريقة</span><select value={ops[name].method} onChange={(e) => setOp(name, { method: e.target.value })}>{["POST", "GET", "PUT", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}</select></label>
                <label className="fld"><span>المسار (يقبل {"{{national_id}}"})</span><input dir="ltr" placeholder="/v1/contracts" value={ops[name].path} onChange={(e) => setOp(name, { path: e.target.value })} /></label>
                <label className="fld"><span>معاملات الاستعلام</span><input dir="ltr" placeholder="id={{national_id}}&month={{period}}" value={ops[name].query_template} onChange={(e) => setOp(name, { query_template: e.target.value })} /></label>
              </div>
              <label className="fld"><span>قالب الجسم JSON</span><textarea dir="ltr" rows={4} placeholder={'{ "id": "{{national_id}}", "salary": "{{gross}}" }'} value={ops[name].body_template} onChange={(e) => setOp(name, { body_template: e.target.value })} /></label>
            </div>))}
          <div className="row"><label className="fld"><span>إضافة عملية</span><input list={"ops_" + p.k} value={newOp} onChange={(e) => setNewOp(e.target.value)} /></label><datalist id={"ops_" + p.k}>{p.ops.map((o) => <option key={o} value={o} />)}</datalist>
            <button className="btn soft" onClick={() => { if (newOp.trim() && !ops[newOp.trim()]) setOp(newOp.trim(), {}); }}>إضافة</button></div>
          <div className="mut">الحقول المتاحة في القوالب: <span dir="ltr">{"{{name}} {{national_id}} {{nationality}} {{birth_date}} {{iban}} {{bank_code}} {{gosi_no}} {{qiwa_contract_no}} {{basic}} {{house}} {{trans}} {{other}} {{gross}} {{net}} {{ge}} {{gr}} {{job}} {{dept}} {{join_date}} {{iqama_expiry}} {{contract_end}} {{email}} {{period}} {{date}}"}</span>. القيمة بين علامتي اقتباس تحافظ على نوعها (رقم أو نص أو null).</div>
        </div>)}
      <div className="actions"><button className="btn" onClick={save}>حفظ ✓</button>{p.k === "ai" && <button className="btn soft" disabled={!row?.has_secret} onClick={async () => { const r = await sb.functions.invoke("awtad-integrations", { body: { action: "ai_report", prompt: "عدد الموظفين حسب القسم", schema: { employees: ["dept", "name"] } } }); if (r.error) { let m = r.error.message; try { m = (await (r.error as any).context.json()).error || m; } catch {} setOk(false); setMsg(m); } else { setOk(true); setMsg("الاتصال بالذكاء الاصطناعي يعمل ✓"); } }}>اختبار الاتصال</button>}{p.k === "resend" && <button className="btn soft" onClick={testMail} disabled={!row?.has_secret}>إرسال بريد تجريبي إليّ</button>}</div>
      {msg && <div className={ok ? "ok" : "er"} style={{ marginTop: 8 }}>{msg}</div>}
    </div>);
}

// صفحة الوظائف العامة: معرّف نصي للمنشأة يُنشئ رابطًا عامًا
function PublicJobsCard() {
  const { user } = useAuth();
  const [slug, setSlug] = useState(""), [msg, setMsg] = useState(""), [ok, setOk] = useState(true);
  useEffect(() => { sb.from(T("organizations")).select("slug").eq("id", getOrg()).maybeSingle().then(({ data }) => setSlug(data?.slug || "")); }, []);
  async function save() {
    const v = slug.trim().toLowerCase();
    if (v && !/^[a-z0-9-]{2,40}$/.test(v)) { setOk(false); return setMsg("حروف إنجليزية صغيرة وأرقام وشرطة فقط (2 إلى 40)"); }
    const { error } = await sb.from(T("organizations")).update({ slug: v || null }).eq("id", getOrg());
    setOk(!error); setMsg(error ? (error.message.includes("duplicate") ? "هذا المعرّف مستخدم" : error.message) : "تم الحفظ");
  }
  const link = typeof window !== "undefined" && slug ? `${window.location.origin}/jobs/${slug}` : "";
  return (<div className="card"><h2>صفحة الوظائف العامة</h2><div className="mut" style={{ marginBottom: 10 }}>ينشئ رابطًا عامًا يعرض وظائفك المفتوحة ويستقبل التقديم دون تسجيل دخول. يحتاج {user?.role === "admin" ? "" : "مدير النظام "}معرّفًا نصيًا فريدًا لمنشأتك.</div>
    <div className="row"><label className="fld"><span>معرّف المنشأة</span><input dir="ltr" placeholder="my-company" value={slug} onChange={(e) => setSlug(e.target.value)} /></label><button className="btn" onClick={save}>حفظ</button></div>
    {link && <div style={{ marginTop: 8 }}>الرابط: <a className="ok" dir="ltr" href={link} target="_blank" rel="noreferrer">{link}</a></div>}{msg && <div className={ok ? "ok" : "er"}>{msg}</div>}</div>);
}

export function SettingsPage() {
  const { rows, load } = useIntegrations();
  return (<>
    <div className="card"><h2>الإعدادات والتكاملات</h2>
      <div className="mut">أدخل مفاتيح API الخاصة بمنشأتك هنا. المفاتيح تُحفظ في القاعدة <b>للكتابة فقط</b> ولا تُعرض للمتصفح مرة أخرى، وتُستخدم من دالة آمنة على الخادم تتصل بالمنصة نيابةً عنك وتسجّل كل عملية في «سجل التكاملات». لا أعرف مسارات وصيغ واجهات الجهات الرسمية، لذلك تُدخلها أنت أو مزوّد التكامل من توثيقها في خانات «العمليات» بدل أن أخمّنها.</div></div>
    <PublicJobsCard />
    {PROVIDERS.map((p) => <Card key={p.k + (rows.find((r) => r.provider === p.k)?.updated_at || "")} p={p} row={rows.find((r) => r.provider === p.k)} reload={load} />)}</>);
}
