import { FormEvent, useEffect, useState } from "react";
import { useParams } from "@/awtad/nav";
import { sb } from "@/awtad/lib/supabase";

type Job = { id: number; title: string; dept?: string; description?: string; requirements?: string };

// صفحة وظائف عامة لمنشأة: تعرض الوظائف المفتوحة وتستقبل التقديم عبر دالة الحافة awtad-careers
export function Jobs() {
  const { org } = useParams<{ org: string }>();
  const [jobs, setJobs] = useState<Job[]>([]), [name, setName] = useState(""), [err, setErr] = useState(""), [open, setOpen] = useState<number | null>(null), [done, setDone] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", cv_text: "", website: "" }), [busy, setBusy] = useState(false);
  useEffect(() => { (async () => { const { data, error } = await sb.functions.invoke("awtad-careers", { body: { action: "jobs", org } }); if (error) { try { setErr((await (error as any).context.json()).error); } catch { setErr("تعذّر تحميل الوظائف"); } } else { setName(data.org); setJobs(data.jobs); } })(); }, [org]);
  async function apply(e: FormEvent, id: number) {
    e.preventDefault(); setBusy(true); setErr("");
    const { data, error } = await sb.functions.invoke("awtad-careers", { body: { action: "apply", org, job_id: id, ...f } });
    setBusy(false);
    if (error) { try { setErr((await (error as any).context.json()).error); } catch { setErr("تعذّر إرسال الطلب"); } return; }
    if (data?.ok) { setDone(true); setOpen(null); setF({ name: "", email: "", phone: "", cv_text: "", website: "" }); }
  }
  return (
    <div className="sec"><div className="wrap">
      <h2>الوظائف المتاحة{name ? ` — ${name}` : ""}</h2>
      {err && <div className="notebox">{err}</div>}
      {done && <div className="notebox" style={{ borderColor: "#22b573" }}>وصلنا طلبك، شكرًا لاهتمامك. سنتواصل معك عند الحاجة.</div>}
      <div className="fcards" style={{ marginTop: 16 }}>
        {jobs.map((j) => (
          <div className="fcard" key={j.id}><b>{j.title}</b><span>{j.dept}</span><span>{j.description}</span>
            {j.requirements && <span>المتطلبات: {j.requirements}</span>}
            {open === j.id ? (
              <form className="demo" onSubmit={(e) => apply(e, j.id)}>
                <input placeholder="الاسم الكامل" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
                <input placeholder="البريد الإلكتروني" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
                <input placeholder="الجوال" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
                <textarea placeholder="الصق سيرتك الذاتية أو نبذة عن خبراتك ومهاراتك" rows={6} value={f.cv_text} onChange={(e) => setF({ ...f, cv_text: e.target.value })} />
                <input style={{ display: "none" }} tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
                <button className="sbtn" disabled={busy}>{busy ? "جارٍ الإرسال..." : "إرسال الطلب"}</button>
              </form>
            ) : <button className="sbtn" onClick={() => { setOpen(j.id); setDone(false); }}>قدّم الآن</button>}
          </div>))}
        {!jobs.length && !err && <div className="fcard">لا توجد وظائف مفتوحة حاليًا.</div>}
      </div>
    </div></div>
  );
}
