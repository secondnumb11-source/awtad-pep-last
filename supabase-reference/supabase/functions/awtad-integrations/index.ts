// أوتاد: دالة التكاملات الآمنة (نُشرت على المشروع باسم awtad-integrations).
// تقرأ الأسرار من awtad_secrets بصلاحية الخادم ولا تُرجعها أبدًا للمتصفح.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PROVIDERS = ["resend", "qiwa", "mudad", "gosi", "muqeem", "absher", "saned", "bank", "accounting", "ai", "whatsapp"];

function safeBase(u: string) {
  let x: URL;
  try { x = new URL(u); } catch { throw new Error("عنوان الواجهة غير صالح"); }
  if (x.protocol !== "https:") throw new Error("يجب أن يبدأ عنوان الواجهة بـ https");
  const h = x.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.)/.test(h) || h === "::1") throw new Error("عنوان داخلي غير مسموح");
  return x;
}
const fill = (tpl: string, data: Record<string, unknown>, enc = false) =>
  tpl
    .replace(/"\{\{(\w+)\}\}"/g, (_m, k) => JSON.stringify(data[k] ?? null))
    .replace(/\{\{(\w+)\}\}/g, (_m, k) => { const v = String(data[k] ?? ""); return enc ? encodeURIComponent(v) : v; });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: u, error: ue } = await admin.auth.getUser(jwt);
    if (ue || !u.user) return json({ error: "غير مصرّح" }, 401);
    const { data: prof } = await admin.from("awtad_profiles").select("org_id,role").eq("id", u.user.id).maybeSingle();
    if (!prof) return json({ error: "لا يوجد ملف شخصي في أوتاد" }, 403);
    const org = prof.org_id as string, role = prof.role as string;
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    const log = async (platform: string, act: string, result: string) => { await admin.from("awtad_integration_logs").insert({ org_id: org, platform, action: act, result: result.slice(0, 300) }); };
    const load = async (provider: string) => {
      if (!PROVIDERS.includes(provider)) throw new Error("منصة غير معروفة");
      const { data } = await admin.from("awtad_secrets").select("config,secret").eq("org_id", org).eq("provider", provider).maybeSingle();
      return data as { config: any; secret: string | null } | null;
    };

    if (action === "status") {
      const { data } = await admin.from("awtad_secrets").select("provider,has_secret,updated_at").eq("org_id", org);
      return json({ providers: data || [] });
    }

    if (action === "send_email") {
      if (!["admin", "hr", "manager"].includes(role)) return json({ error: "غير مسموح" }, 403);
      const s = await load("resend");
      if (!s?.secret || !s.config?.from) return json({ error: "لم تُضبط إعدادات Resend (المفتاح وعنوان المرسل) في صفحة الإعدادات" }, 400);
      const to: string[] = (Array.isArray(body.to) ? body.to : [body.to]).filter(Boolean).map((x: string) => String(x).trim().toLowerCase());
      if (!to.length || !body.subject) return json({ error: "المستلم والموضوع مطلوبان" }, 400);
      // منع استخدام الدالة كمرحّل مفتوح: المستلمون من موظفي المنشأة أو مستخدميها أو المستخدم نفسه فقط
      const [{ data: e1 }, { data: e2 }] = await Promise.all([
        admin.from("awtad_employees").select("email").eq("org_id", org).not("email", "is", null),
        admin.from("awtad_profiles").select("email").eq("org_id", org).not("email", "is", null)]);
      const allowed = new Set([...(e1 || []), ...(e2 || [])].map((r: any) => String(r.email).toLowerCase()).concat([String(u.user.email || "").toLowerCase()]));
      const bad = to.filter((x) => !allowed.has(x));
      if (bad.length) return json({ error: "مستلم غير مسجّل في منشأتك: " + bad.join("، ") }, 400);
      const payload: any = { from: s.config.from, to, subject: body.subject, html: body.html || `<p>${String(body.text || "").replace(/</g, "&lt;")}</p>` };
      if (s.config.reply_to) payload.reply_to = s.config.reply_to;
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${s.secret}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const txt = await r.text();
      await log("Resend", `إرسال بريد (${to.length})`, r.ok ? "نجحت" : `فشلت ${r.status}: ${txt}`);
      return json({ ok: r.ok, status: r.status, body: txt.slice(0, 1000) }, r.ok ? 200 : 502);
    }

    if (action === "call") {
      if (!["admin", "hr"].includes(role)) return json({ error: "غير مسموح" }, 403);
      const provider = String(body.platform || ""), op = String(body.op || "");
      const s = await load(provider);
      const c = s?.config || {};
      const o = c.ops?.[op];
      if (!s || !c.base_url || !o) return json({ error: `لم تُضبط الواجهة أو العملية «${op}» لهذه المنصة في صفحة الإعدادات` }, 400);
      const base = safeBase(c.base_url);
      const data = (body.data || {}) as Record<string, unknown>;
      const path = fill(String(o.path || ""), data, true);
      const target = new URL(path.replace(/^\//, ""), base.href.endsWith("/") ? base.href : base.href + "/");
      if (target.hostname !== base.hostname) throw new Error("المسار يخرج عن نطاق الواجهة");
      if (o.query_template) fill(String(o.query_template), data, true).split("&").filter(Boolean).forEach((p: string) => { const [k, ...v] = p.split("="); target.searchParams.set(k, v.join("=")); });
      const headers: Record<string, string> = { Accept: "application/json", ...(c.extra_headers || {}) };
      const at = c.auth_type || "bearer";
      if (at === "bearer" && s.secret) headers.Authorization = `Bearer ${s.secret}`;
      else if (at === "header" && s.secret) headers[c.header_name || "x-api-key"] = s.secret;
      else if (at === "basic" && s.secret) headers.Authorization = `Basic ${btoa(`${c.username || ""}:${s.secret}`)}`;
      const method = String(o.method || "POST").toUpperCase();
      const init: RequestInit = { method, headers, signal: AbortSignal.timeout(25000) };
      if (method !== "GET" && method !== "HEAD" && o.body_template) { init.body = fill(String(o.body_template), data); headers["Content-Type"] = headers["Content-Type"] || "application/json"; }
      const r = await fetch(target.toString(), init);
      const txt = await r.text();
      await log(c.label || provider, `${op}${body.ref ? " — " + body.ref : ""}`, r.ok ? "نجحت" : `فشلت ${r.status}: ${txt}`);
      return json({ ok: r.ok, status: r.status, body: txt.slice(0, 2000) }, r.ok ? 200 : 502);
    }


    // ===== الذكاء الاصطناعي: يحوّل الطلب إلى مواصفة تقرير JSON تُنفَّذ في المتصفح (لا تُرسَل بيانات الموظفين) =====
    if (action === "ai_report") {
      if (!["admin", "hr", "manager", "accountant"].includes(role)) return json({ error: "غير مسموح" }, 403);
      const s = await load("ai");
      if (!s?.secret) return json({ error: "لم يُضبط مفتاح الذكاء الاصطناعي في صفحة الإعدادات" }, 400);
      const prompt = String(body.prompt || "").slice(0, 1000);
      if (!prompt.trim()) return json({ error: "اكتب وصف التقرير" }, 400);
      const system = `أنت محلل تقارير داخل نظام موارد بشرية ومحاسبة سعودي. حوّل طلب المستخدم إلى مواصفة تقرير بصيغة JSON فقط دون أي نص آخر ودون علامات markdown.
الصيغة: {"title":"عنوان عربي","dataset":"مفتاح من القائمة","columns":["أعمدة من القائمة"],"filters":[{"c":"عمود","op":"يحتوي|=|≠|>|<","v":"قيمة"}],"sort":"عمود أو null","desc":true|false,"group_by":"عمود أو null","metric":"count|sum|avg|null","metric_col":"عمود رقمي أو null","limit":عدد,"summary":"جملة تشرح ما يعرضه التقرير"}.
استخدم فقط مجموعات البيانات والأعمدة التالية ولا تخترع غيرها: ${JSON.stringify(body.schema || {})}.
تاريخ اليوم ${new Date().toISOString().slice(0, 10)}. للتواريخ استخدم صيغة YYYY-MM-DD في المرشحات مع > أو <.`;
      const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": s.secret, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: s.config?.model || "claude-sonnet-5-5", max_tokens: 1200, system, messages: [{ role: "user", content: prompt }] }), signal: AbortSignal.timeout(40000) });
      const j = await r.json().catch(() => ({}));
      await log("الذكاء الاصطناعي", "توليد تقرير", r.ok ? "نجحت" : `فشلت ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
      if (!r.ok) return json({ error: j?.error?.message || `فشل الاتصال (${r.status})` }, 502);
      const text = String(j?.content?.[0]?.text || ""), m = text.match(/\{[\s\S]*\}/);
      if (!m) return json({ error: "لم يُرجع النموذج مواصفة صالحة" }, 502);
      try { return json({ spec: JSON.parse(m[0]) }); } catch { return json({ error: "تعذّر قراءة مواصفة التقرير" }, 502); }
    }

    // ===== واتساب (Meta Cloud API) =====
    if (action === "send_whatsapp") {
      if (!["admin", "hr"].includes(role)) return json({ error: "غير مسموح" }, 403);
      const s = await load("whatsapp"), c = s?.config || {};
      if (!s?.secret || !c.phone_number_id) return json({ error: "لم تُضبط إعدادات واتساب (المفتاح ومعرّف رقم الهاتف) في صفحة الإعدادات" }, 400);
      const to = String(body.to || "").replace(/\D/g, "");
      if (to.length < 9) return json({ error: "رقم الجوال غير صالح (أدخله بالصيغة الدولية)" }, 400);
      const payload: any = c.template
        ? { messaging_product: "whatsapp", to, type: "template", template: { name: c.template, language: { code: c.lang || "ar" }, components: [{ type: "body", parameters: (body.params || []).map((t: unknown) => ({ type: "text", text: String(t) })) }] } }
        : { messaging_product: "whatsapp", to, type: "text", text: { body: String(body.text || "").slice(0, 3500) } };
      const r = await fetch(`https://graph.facebook.com/${c.api_version || "v21.0"}/${c.phone_number_id}/messages`, { method: "POST", headers: { Authorization: `Bearer ${s.secret}`, "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
      const txt = await r.text();
      await log("واتساب", "إرسال رسالة", r.ok ? "نجحت" : `فشلت ${r.status}: ${txt}`);
      return json({ ok: r.ok, status: r.status, body: txt.slice(0, 600) }, r.ok ? 200 : 502);
    }

    // ===== بوابة الموظف الخارجية: إنشاء حساب بالاسم وكلمة السر (بلا بريد حقيقي) =====
    if (action === "portal_create" || action === "portal_reset" || action === "portal_disable") {
      if (!["admin", "hr"].includes(role)) return json({ error: "غير مسموح" }, 403);
      const eid = Number(body.employee_id);
      const { data: emp } = await admin.from("awtad_employees").select("id,name").eq("id", eid).eq("org_id", org).maybeSingle();
      if (!emp) return json({ error: "الموظف غير موجود في منشأتك" }, 404);
      const { data: ex } = await admin.from("awtad_profiles").select("id,portal_username").eq("org_id", org).eq("employee_id", eid).maybeSingle();
      if (action === "portal_create") {
        const username = String(body.username || "").trim().toLowerCase(), password = String(body.password || "");
        if (ex) return json({ error: "للموظف حساب مسبقًا. استخدم إعادة تعيين كلمة السر" }, 400);
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) return json({ error: "اسم المستخدم: حروف إنجليزية صغيرة وأرقام ونقطة وشرطة (3 إلى 30)" }, 400);
        if (password.length < 8) return json({ error: "كلمة السر 8 أحرف على الأقل" }, 400);
        const { data: dup } = await admin.from("awtad_profiles").select("id").eq("portal_username", username).maybeSingle();
        if (dup) return json({ error: "اسم المستخدم مستخدم، اختر غيره" }, 400);
        const email = `${username}@employees.example.com`;
        const { data: cu, error: ce } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: emp.name, portal: true } });
        if (ce || !cu.user) return json({ error: "تعذّر إنشاء الحساب: " + (ce?.message || "") }, 400);
        const { error: pe } = await admin.from("awtad_profiles").insert({ id: cu.user.id, org_id: org, role: "employee", employee_id: eid, full_name: emp.name, email, module_access: Array.isArray(body.modules) && body.modules.length ? body.modules : null, portal_username: username, portal_created_at: new Date().toISOString() });
        if (pe) { await admin.auth.admin.deleteUser(cu.user.id); return json({ error: "تعذّر ربط الحساب: " + pe.message }, 500); }
        await admin.from("awtad_employees").update({ portal_username: username }).eq("id", eid);
        await log("بوابة الموظف", `إنشاء حساب ${username}`, "نجحت");
        return json({ ok: true, username });
      }
      if (!ex) return json({ error: "لا يوجد حساب لهذا الموظف" }, 404);
      if (action === "portal_reset") {
        const password = String(body.password || ""); if (password.length < 8) return json({ error: "كلمة السر 8 أحرف على الأقل" }, 400);
        const { error } = await admin.auth.admin.updateUserById(ex.id, { password }); if (error) return json({ error: error.message }, 400);
        await log("بوابة الموظف", `إعادة تعيين كلمة سر ${ex.portal_username}`, "نجحت"); return json({ ok: true });
      }
      const { error } = await admin.auth.admin.updateUserById(ex.id, { ban_duration: body.disable ? "87600h" : "none" }); if (error) return json({ error: error.message }, 400);
      await log("بوابة الموظف", `${body.disable ? "تعطيل" : "تفعيل"} حساب ${ex.portal_username}`, "نجحت"); return json({ ok: true });
    }

    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
