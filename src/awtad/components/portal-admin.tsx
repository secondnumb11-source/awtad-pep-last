// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { sb } from "@/awtad/lib/supabase";
import { Row } from "@/awtad/lib/calc";

const Field = ({ l, children }: { l: string; children: ReactNode }) => <label className="fld"><span>{l}</span>{children}</label>;
const BASIC = ["ess", "portal", "attendance", "leaves", "req-att", "req-ot", "req-perm", "req-leave", "req-admin", "expenses", "loans", "letters", "documents", "notifications", "news", "survey-answer", "certificates", "field-reports", "holidays", "eosb", "salary-calc", "alerts", "guide"];
const genPw = () => { const c = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"; const a = new Uint32Array(10); crypto.getRandomValues(a); return Array.from(a, (x) => c[x % c.length]).join("") + "7"; };
const waNum = (p: string) => { const x = String(p || "").replace(/\D/g, ""); return x.startsWith("05") ? "966" + x.slice(1) : x.startsWith("5") && x.length === 9 ? "966" + x : x; };

// ===== بوابات الموظفين الخارجية: إنشاء الحساب والصلاحيات وإرسال بيانات الدخول =====
export function PortalAdmin() {
  const { d, company, reload } = useData();
  const { MODULES } = require("./registry") as typeof import("./registry");
  const emps = (d.employees || []).filter((e) => e.active !== false), prof = (id: number) => (d.profiles || []).find((p) => p.employee_id === id);
  const [sel, setSel] = useState<Row | null>(null), [f, setF] = useState<Row>({}), [mods, setMods] = useState<string[]>(BASIC), [msg, setMsg] = useState(""), [ok, setOk] = useState(true), [out, setOut] = useState<{ text: string; phone: string; user: string; pw: string; name: string } | null>(null), [busy, setBusy] = useState(false);
  const allowable = MODULES.filter((m) => m.roles.includes("employee"));
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const invoke = async (body: any) => { const r = await sb.functions.invoke("awtad-integrations", { body }); if (r.error) { let m = r.error.message; try { m = (await (r.error as any).context.json()).error || m; } catch {} throw new Error(m); } return r.data; };
  function start(e: Row) { setSel(e); setOut(null); setMsg(""); setF({ username: `emp${e.id}`, password: genPw(), phone: e.phone || "" }); setMods(BASIC); }
  const message = (name: string, u: string, p: string) => `مرحبًا ${name} 👋\nتم تفعيل بوابتك في ${company?.name_ar || "منشأتك"} على أوتاد.\n\nالرابط: ${origin}/login\nاسم المستخدم: ${u}\nكلمة السر: ${p}\n\nيمكنك من البوابة متابعة حضورك وإجازاتك وكشف راتبك وتقديم طلباتك. غيّر كلمة السر بعد أول دخول من «بوابتي».\nيمكنك تثبيتها كتطبيق على جوالك: افتح الرابط ثم «إضافة إلى الشاشة الرئيسية».`;
  async function create() {
    if (!sel) return; setBusy(true); setMsg("");
    try {
      if (f.phone && f.phone !== sel.phone) await sb.from("awtad_employees").update({ phone: f.phone }).eq("id", sel.id);
      await invoke({ action: "portal_create", employee_id: sel.id, username: f.username.trim().toLowerCase(), password: f.password, modules: mods });
      setOk(true); setMsg("فُعّلت البوابة"); setOut({ text: message(sel.name, f.username.trim().toLowerCase(), f.password), phone: f.phone || "", user: f.username, pw: f.password, name: sel.name }); await reload();
    } catch (e: any) { setOk(false); setMsg(e.message); } finally { setBusy(false); }
  }
  async function reset(e: Row) { const pw = genPw(); try { await invoke({ action: "portal_reset", employee_id: e.id, password: pw }); const u = prof(e.id)?.portal_username; setSel(e); setOk(true); setMsg("أُعيد تعيين كلمة السر"); setOut({ text: message(e.name, u, pw), phone: e.phone || "", user: u, pw, name: e.name }); } catch (x: any) { setOk(false); setMsg(x.message); } }
  async function toggle(e: Row, disable: boolean) { try { await invoke({ action: "portal_disable", employee_id: e.id, disable }); setOk(true); setMsg(disable ? "عُطّل الحساب" : "فُعّل الحساب"); await reload(); } catch (x: any) { setOk(false); setMsg(x.message); } }
  async function sendWa() { if (!out) return; try { await invoke({ action: "send_whatsapp", to: waNum(out.phone), text: out.text, params: [out.name, `${origin}/login`, out.user, out.pw] }); setOk(true); setMsg("أُرسلت الرسالة عبر واتساب"); } catch (x: any) { setOk(false); setMsg(x.message + " — يمكنك استخدام «فتح واتساب» لإرسالها يدويًا"); } }
  return (<>
    <div className="card"><h2>بوابات الموظفين</h2><div className="mut">أنشئ لكل موظف اسم مستخدم وكلمة سر وحدّد الصفحات التي تظهر له. تُعرض بيانات الدخول مرة واحدة هنا لترسلها له (واتساب مباشرة أو نسخًا)، ولا تُخزَّن كلمة السر في النظام.</div>{msg && <div className={ok ? "ok" : "er"} style={{ marginTop: 8 }}>{msg}</div>}</div>
    <div className="card scroll"><table><thead><tr><th>الموظف</th><th>الجوال</th><th>البوابة</th><th /></tr></thead><tbody>{emps.map((e) => { const p = prof(e.id); return <tr key={e.id}><td>{e.name}</td><td dir="ltr">{e.phone || "—"}</td><td>{p?.portal_username ? <span className="ok">مفعّلة: {p.portal_username}</span> : p ? <span className="mut">يملك حساب مستخدم عادي</span> : <span className="mut">غير مفعّلة</span>}</td>
      <td>{!p && <button className="btn sm" onClick={() => start(e)}>تفعيل البوابة</button>}{p?.portal_username && <><button className="btn sm" onClick={() => reset(e)}>إعادة كلمة السر</button><button className="btn sm dng" onClick={() => toggle(e, true)}>تعطيل</button><button className="btn sm" onClick={() => toggle(e, false)}>إلغاء التعطيل</button></>}</td></tr>; })}</tbody></table></div>
    {sel && !out && !prof(sel.id) && <div className="card"><h2>تفعيل بوابة: {sel.name}</h2><div className="fgrid"><Field l="اسم المستخدم (إنجليزي)"><input dir="ltr" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></Field>
      <Field l="كلمة السر"><div className="row"><input dir="ltr" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /><button className="btn sm" onClick={() => setF({ ...f, password: genPw() })}>توليد</button></div></Field>
      <Field l="جوال الموظف (للواتساب)"><input dir="ltr" placeholder="05xxxxxxxx" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field></div>
      <h2 style={{ marginTop: 14 }}>الصفحات الظاهرة للموظف</h2><div className="row" style={{ marginBottom: 8 }}><button className="btn sm" onClick={() => setMods(BASIC)}>الأساسية</button><button className="btn sm" onClick={() => setMods(allowable.map((m) => m.key))}>الكل</button><button className="btn sm" onClick={() => setMods(["portal", "guide"])}>بوابتي فقط</button></div>
      <div className="modgrid">{allowable.map((m) => <label key={m.key} className="chk"><input type="checkbox" checked={mods.includes(m.key)} onChange={(e) => setMods(e.target.checked ? [...mods, m.key] : mods.filter((k) => k !== m.key))} />{m.title}</label>)}</div>
      <div className="actions"><button className="btn" onClick={create} disabled={busy}>{busy ? "جارٍ التفعيل..." : "تفعيل البوابة ✓"}</button><button className="btn cancel" onClick={() => setSel(null)}>إلغاء ✕</button></div></div>}
    {out && <div className="card"><h2>رسالة الترحيب وبيانات الدخول</h2><pre className="tpl" style={{ maxHeight: 260 }}>{out.text}</pre>
      <div className="actions"><button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(out.text); setOk(true); setMsg("نُسخت الرسالة"); } catch {} }}>نسخ الرسالة</button>
        <a className="btn soft" href={`https://wa.me/${waNum(out.phone)}?text=${encodeURIComponent(out.text)}`} target="_blank" rel="noreferrer">فتح واتساب</a><button className="btn soft" onClick={sendWa}>إرسال تلقائي (واتساب API)</button><button className="btn cancel" onClick={() => { setOut(null); setSel(null); }}>تم</button></div>
      <div className="mut">احفظ كلمة السر الآن، فلن تظهر مرة أخرى. «إرسال تلقائي» يتطلب ضبط واتساب في الإعدادات.</div></div>}</>);
}
