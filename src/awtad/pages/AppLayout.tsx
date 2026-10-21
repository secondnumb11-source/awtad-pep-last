import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "@/awtad/nav";
import { useAuth } from "@/awtad/lib/auth";
import { DataProvider } from "@/awtad/lib/data";
import { Shell } from "@/awtad/components/Shell";
import { GuideModal } from "@/awtad/components/guide";

function Setup() {
  const { createOrg, logout } = useAuth();
  const [org, setOrg] = useState(""), [name, setName] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  async function go(e: FormEvent) { e.preventDefault(); if (!org.trim()) return setErr("اسم المنشأة مطلوب"); setBusy(true); const r = await createOrg(org.trim(), name.trim()); setBusy(false); if (r) setErr(r); }
  return (
    <div className="login"><form className="card" onSubmit={go}>
      <div className="brand dark">أوتاد</div><h2>إنشاء المنشأة</h2>
      <div className="mut">إن كنت أول من يستخدم النظام لمنشأتك فأنشئها هنا وستصبح مدير النظام.</div><div className="mut"><b>إن كنت موظفًا في منشأة قائمة</b> فلا تنشئ منشأة جديدة: اطلب من مدير النظام ربط حسابك ببريدك ثم اضغط «تحديث».</div><button type="button" className="btn soft" onClick={() => window.location.reload()}>تحديث</button>
      <label className="fld"><span>اسم المنشأة <b className="req">*</b></span><input value={org} onChange={(e) => setOrg(e.target.value)} /></label>
      <label className="fld"><span>اسمك</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <button className="btn" disabled={busy}>{busy ? "جارٍ الإنشاء..." : "إنشاء"}</button>
      <div className="er">{err}</div>
      <button type="button" className="btn cancel" onClick={logout}>تسجيل الخروج</button>
    </form></div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, authed, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !authed) router.replace("/login"); }, [ready, authed, router]);
  if (!ready || !authed) return <div className="card" style={{ margin: 40 }}>جارٍ التحقق من الدخول...</div>;
  if (!user) return <Setup />;
  return <DataProvider><Shell>{children}</Shell><GuideModal /></DataProvider>;
}
