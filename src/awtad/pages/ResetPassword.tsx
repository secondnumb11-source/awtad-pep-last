import { useState, type FormEvent } from "react";
import { Link } from "@/awtad/nav";
import { useAuth } from "@/awtad/lib/auth";
import { saveRecoveredPassword } from "@/awtad/lib/password-recovery";
import { Button } from "@/components/ui/button";

export function ResetPassword() {
  const { recovering, ready } = useAuth();
  const [fromLink] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const valid = recovering || fromLink;
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    const error = await saveRecoveredPassword(password, confirmation, valid);
    setBusy(false);
    if (error) setMessage(error);
    else { setDone(true); setPassword(""); setConfirmation(""); }
  }
  return <div className="login"><form className="card" onSubmit={submit}>
    <div className="brand dark">أوتاد</div>
    <h2>تعيين كلمة مرور جديدة</h2>
    {!ready ? <div role="status">جارٍ التحقق من رابط الاستعادة...</div> : done ? <>
      <div className="ok" role="status">تم تغيير كلمة المرور بنجاح.</div>
      <Link className="btn" href="/dashboard">متابعة إلى حسابك</Link>
    </> : valid ? <>
      <label className="fld"><span>كلمة المرور الجديدة</span><input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label className="fld"><span>تأكيد كلمة المرور الجديدة</span><input type="password" autoComplete="new-password" required minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label>
      <Button className="btn" type="submit" disabled={busy}>{busy ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}</Button>
      <div className="er" role="alert">{message}</div>
    </> : <div className="er" role="alert">رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من «نسيت كلمة المرور؟».</div>}
    {!done && <Link className="linkbtn" href="/login">العودة إلى تسجيل الدخول</Link>}
  </form></div>;
}