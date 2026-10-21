import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { sb, T, setOrg } from "./supabase";

export type User = { id: string; email: string; role: string; label: string; orgId: string; employeeId: number | null; name: string; moduleAccess: string[] | null };
type Ctx = {
  user: User | null; authed: boolean; ready: boolean; recovering: boolean;
  login: (email: string, pw: string) => Promise<string | null>;
  signup: (email: string, pw: string) => Promise<string | null>;
  createOrg: (org: string, name: string) => Promise<string | null>;
  logout: () => Promise<void>;
};
const C = createContext<Ctx>(null as any);
export const useAuth = () => useContext(C);
const LABELS: Record<string, string> = { accountant: "محاسب", admin: "مدير النظام", hr: "مسؤول الموارد البشرية", manager: "مدير قسم", employee: "موظف" };
const tr = (m: string) =>
  /Invalid login/i.test(m) ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
  : /not confirmed/i.test(m) ? "لم يتم تأكيد البريد بعد. افتح رسالة التأكيد في بريدك ثم أعد المحاولة"
  : /already registered|already been registered/i.test(m) ? "هذا البريد مسجّل مسبقًا، سجّل الدخول"
  : /at least|weak/i.test(m) ? "كلمة المرور ضعيفة، استخدم 8 أحرف على الأقل" : m;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [recovering, setRecovering] = useState(false);

  // لا يرمي أخطاء: أي فشل ينتهي بحالة واضحة بدل تجمّد الشاشة
  async function load(session: any) {
    try {
      if (!session) { setAuthed(false); setUser(null); setOrg(""); return; }
      setAuthed(true);
      const { data } = await sb.from(T("profiles")).select("role,org_id,full_name,employee_id,module_access").eq("id", session.user.id).maybeSingle();
      if (data) {
        setOrg(data.org_id);
        let role = data.role;
        try { const r = await sb.rpc("awtad_my_role"); if (r.data) role = r.data; } catch {}
        setUser({ id: session.user.id, email: session.user.email || "", role, label: LABELS[role] || role, orgId: data.org_id, employeeId: data.employee_id, name: data.full_name || session.user.email || "", moduleAccess: data.module_access || null });
      } else setUser(null);
    } catch { setUser(null); }
    finally { setReady(true); }
  }
  useEffect(() => {
    setRecovering(new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery");
    sb.auth.getSession().then(({ data }) => load(data.session)).catch(() => setReady(true));
    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setRecovering(false);
      setTimeout(() => load(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login: Ctx["login"] = async (email, pw) => {
    const id = email.trim(), em = id.includes("@") ? id : `${id.toLowerCase()}@employees.example.com`;
    const { error } = await sb.auth.signInWithPassword({ email: em, password: pw });
    return error ? tr(error.message) : null;
  };
  const signup: Ctx["signup"] = async (email, pw) => {
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password: pw });
    if (error) return tr(error.message);
    return data.session ? null : "تم إنشاء الحساب. افتح رسالة التأكيد في بريدك ثم سجّل الدخول.";
  };
  const createOrg: Ctx["createOrg"] = async (org, name) => {
    const { error } = await sb.rpc("awtad_create_org", { org_name: org, my_name: name });
    if (error) return error.message;
    const { data } = await sb.auth.getSession(); await load(data.session); return null;
  };
  const logout = async () => { await sb.auth.signOut(); };
  return <C.Provider value={{ user, authed, ready, recovering, login, signup, createOrg, logout }}>{children}</C.Provider>;
}
