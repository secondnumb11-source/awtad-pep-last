// @ts-nocheck -- ported from original project (looser TS settings)
import { createClient } from "@supabase/supabase-js";

// كل جداول أوتاد تبدأ بالبادئة awtad_ (انظر PROJECT.md). غيّر البادئة من هنا فقط.
export const PREFIX = "awtad_";
export const T = (name: string) => `${PREFIX}${name}`;

export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || "https://ughgsvcznhyokbiyscvq.supabase.co") as string;
export const sb = createClient(SUPABASE_URL, (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_KDHhDJhkFh-VdDs_0UbHHA_6vFwNObW") as string);

// معرّف منشأة المستخدم الحالي (يُضبط بعد تسجيل الدخول من ملفه الشخصي)
let ORG = "";
export const setOrg = (id: string) => { ORG = id; };
export const getOrg = () => ORG;

export async function upd(table: string, id: number | string, patch: Record<string, any>) {
  const { error } = await sb.from(T(table)).update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function ins(table: string, row: Record<string, any>) {
  const { error } = await sb.from(T(table)).insert({ org_id: ORG, ...row });
  if (error) throw new Error(error.message);
}
export async function del(table: string, id: number | string) {
  const { error } = await sb.from(T(table)).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
