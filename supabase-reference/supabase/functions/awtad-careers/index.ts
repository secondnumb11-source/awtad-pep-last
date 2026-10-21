// أوتاد: دالة صفحة الوظائف العامة (نُشرت باسم awtad-careers بلا تسجيل دخول verify_jwt=false).
// تعرض الوظائف المفتوحة لمنشأة بمعرّفها النصي (slug) وتستقبل التقديم مع فرز مبدئي بالكلمات المفتاحية.
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const slug = String(body.org || "").toLowerCase().trim();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return json({ error: "رابط المنشأة غير صالح" }, 400);
    const { data: org } = await admin.from("awtad_organizations").select("id,name").eq("slug", slug).maybeSingle();
    if (!org) return json({ error: "المنشأة غير موجودة" }, 404);

    if (body.action === "jobs") {
      const { data } = await admin.from("awtad_jobs").select("id,title,dept,description,requirements").eq("org_id", org.id).eq("status", "مفتوحة").order("id", { ascending: false });
      return json({ org: org.name, jobs: data || [] });
    }

    if (body.action === "apply") {
      if (body.website) return json({ ok: true }); // مصفاة الروبوتات: حقل خفي يجب ألا يُملأ
      const name = String(body.name || "").trim(), email = String(body.email || "").trim().toLowerCase(), phone = String(body.phone || "").trim().slice(0, 30);
      const cv = String(body.cv_text || "").slice(0, 8000);
      if (name.length < 2 || name.length > 100) return json({ error: "الاسم مطلوب" }, 400);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "بريد إلكتروني غير صالح" }, 400);
      const { data: job } = await admin.from("awtad_jobs").select("id,title,requirements").eq("id", Number(body.job_id)).eq("org_id", org.id).eq("status", "مفتوحة").maybeSingle();
      if (!job) return json({ error: "الوظيفة غير متاحة" }, 404);
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const { count } = await admin.from("awtad_candidates").select("id", { count: "exact", head: true }).eq("org_id", org.id).eq("job_id", job.id).eq("email", email).gte("created_at", since);
      if ((count || 0) > 0) return json({ error: "وصلنا طلبك مسبقًا لهذه الوظيفة" }, 429);
      // فرز مبدئي بالكلمات المفتاحية: نسبة متطلبات الوظيفة الواردة في نص المتقدم
      const kws = String(job.requirements || "").split(/[\n,،;]+/).map((x: string) => x.trim().toLowerCase()).filter((x: string) => x.length >= 2);
      const hay = (cv + " " + String(body.cover || "")).toLowerCase();
      const score = kws.length ? Math.round((kws.filter((k: string) => hay.includes(k)).length / kws.length) * 100) : null;
      const { error } = await admin.from("awtad_candidates").insert({ org_id: org.id, name, job: job.title, stage: 0, job_id: job.id, email, phone, cv_text: cv, score });
      if (error) return json({ error: "تعذّر حفظ الطلب" }, 500);
      return json({ ok: true });
    }
    return json({ error: "إجراء غير معروف" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
