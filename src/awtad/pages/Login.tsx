import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "@/awtad/nav";
import { useAuth } from "@/awtad/lib/auth";
import { Button } from "@/components/ui/button";
import { requestPasswordRecovery } from "@/awtad/lib/password-recovery";
import { Link } from "@/awtad/nav";
import { BrandLockup, TrialTicker, logoWhite } from "@/awtad/components/site/Brand";
import { IMG } from "@/awtad/lib/brand";

export function Login() {
  const { login, signup, authed, ready, recovering } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState(""), [pw, setPw] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { if (recovering) router.replace("/reset-password"); else if (ready && authed) router.replace("/dashboard"); }, [ready, authed, recovering, router]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      const r = mode === "reset" ? await requestPasswordRecovery(email, window.location.origin) : mode === "in" ? await login(email, pw) : await signup(email, pw);
      if (r) setMsg(r);
      else if (mode === "reset") setMsg("تم طلب رابط الاستعادة. إذا كان البريد مسجّلًا، ستصلك رسالة لتعيين كلمة مرور جديدة. تحقق أيضًا من البريد غير المرغوب فيه.");
    } catch { setMsg("تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة."); }
    finally { setBusy(false); }
  }
  return (
    <div className="login lux-login">
      <TrialTicker />
      <div className="ll-g">
      <div className="ll-art"><img className="hero-bg" src={IMG.home} alt="" /><div className="ll-c"><img src={logoWhite} alt="شعار أوتاد الفهد" /><h1 className="shine">أوتاد الفهد</h1><p>الموارد البشرية والمالية في رؤية واحدة</p></div></div>
      <div className="ll-f">
      <form className="card" onSubmit={submit}>
        <BrandLockup />
        <h2>{mode === "reset" ? "استعادة كلمة المرور" : mode === "in" ? "تسجيل الدخول" : "إنشاء حساب جديد"}</h2>
        <label className="fld"><span>{mode === "in" ? "البريد الإلكتروني أو اسم المستخدم" : "البريد الإلكتروني"}</span><input type={mode === "in" ? "text" : "email"} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        {mode !== "reset" && <label className="fld"><span>كلمة المرور</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} required minLength={6} /></label>}
        <Button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ المعالجة..." : mode === "reset" ? "إرسال رابط الاستعادة" : mode === "in" ? "دخول" : "إنشاء الحساب"}</Button>
        <div role="status" aria-live="polite" className={msg.startsWith("تم") ? "ok" : "er"}>{msg}</div>
        {mode !== "reset" && <Button type="button" variant="link" className="linkbtn" disabled={busy} onClick={() => { setMode("reset"); setMsg(""); setPw(""); }}>نسيت كلمة المرور؟</Button>}
        <Button type="button" variant="link" className="linkbtn" disabled={busy} onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); setPw(""); }}>
          {mode === "reset" ? "العودة إلى تسجيل الدخول" : mode === "in" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب؟ سجّل الدخول"}
        </Button>
        <Link className="linkbtn home-l" href="/">← الصفحة الرئيسية</Link>
      </form>
      </div>
      </div>
    </div>
  );
}
