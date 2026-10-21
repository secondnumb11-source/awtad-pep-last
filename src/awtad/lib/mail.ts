import { sb } from "./supabase";

// يستخرج رسالة الخطأ الحقيقية من استجابة دالة الحافة
async function errMsg(error: any): Promise<string> {
  try { const j = await error?.context?.json?.(); if (j?.error) return j.error; if (j?.body) return String(j.body); } catch {}
  return error?.message || "تعذّر الاتصال بدالة التكاملات";
}
export async function sendMail(to: string | string[], subject: string, html: string): Promise<{ ok: boolean; msg: string }> {
  try {
    const { data, error } = await sb.functions.invoke("awtad-integrations", { body: { action: "send_email", to, subject, html } });
    if (error) return { ok: false, msg: await errMsg(error) };
    return { ok: !!data?.ok, msg: data?.error || "" };
  } catch (e: any) { return { ok: false, msg: e?.message || "" }; }
}
export async function callIntegration(platform: string, op: string, data: Record<string, any>, ref?: string): Promise<{ ok: boolean; status?: number; body?: string; msg?: string }> {
  try {
    const r = await sb.functions.invoke("awtad-integrations", { body: { action: "call", platform, op, data, ref } });
    if (r.error) return { ok: false, msg: await errMsg(r.error) };
    return { ok: !!r.data?.ok, status: r.data?.status, body: r.data?.body, msg: r.data?.error };
  } catch (e: any) { return { ok: false, msg: e?.message || "" }; }
}
