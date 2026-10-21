import { sb } from "./supabase";

export async function requestPasswordRecovery(email: string, origin: string) {
  const address = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return "أدخل البريد الإلكتروني المسجّل للحساب، وليس اسم المستخدم.";
  try {
    const { error } = await sb.auth.resetPasswordForEmail(address, { redirectTo: `${origin}/reset-password` });
    return error ? (/rate|too many/i.test(error.message) ? "تم إرسال طلبات كثيرة. انتظر قليلًا ثم أعد المحاولة." : "تعذّر إرسال رابط الاستعادة. حاول مرة أخرى لاحقًا.") : null;
  } catch { return "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة."; }
}

export async function saveRecoveredPassword(password: string, confirmation: string, recovery: boolean) {
  if (!recovery) return "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.";
  if (password.length < 8) return "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل.";
  if (password !== confirmation) return "كلمتا المرور غير متطابقتين.";
  try {
    const { data, error: userError } = await sb.auth.getUser();
    if (userError || !data.user) return "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.";
    const { error } = await sb.auth.updateUser({ password });
    if (error) return /same password/i.test(error.message) ? "اختر كلمة مرور مختلفة عن كلمة المرور السابقة." : "تعذّر تغيير كلمة المرور. اطلب رابطًا جديدًا وحاول مرة أخرى.";
    return null;
  } catch { return "تعذّر الاتصال. تحقق من الإنترنت ثم أعد المحاولة."; }
}