// @ts-nocheck -- ported from original project (looser TS settings)
export type Row = Record<string, any>;
export type Settings = { sEmp: number; sEr: number; nEr: number; cap: number; shift: string; limit: number };
export const DEFAULT_SET: Settings = { sEmp: 9.75, sEr: 11.75, nEr: 2, cap: 45000, shift: "08:00", limit: 1000 };

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (d: string, k: number) => { const x = new Date(d); x.setDate(x.getDate() + k); return x.toISOString().slice(0, 10); };
export const n = (x: any) => (+x || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
export const gross = (x: Row) => (+x.basic || 0) + (+x.house || 0) + (+x.trans || 0) + (+x.other || 0);
export function addMin(t: string, m: number) {
  const [h, mi] = t.split(":").map(Number); const x = h * 60 + mi + m;
  return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0");
}

// مسير الرواتب: الأجر الخاضع للتأمينات = الأساسي + السكن (بسقف)، الإضافي = ساعات × (الأساسي ÷ 30 ÷ 8) × 1.5
export function payRow(x: Row, s: Settings, ot = 0, ab = 0, loan = 0, reimb = 0) {
  const g = gross(x), otp = ot * ((+x.basic || 0) / 30 / 8) * 1.5, abd = ab * (g / 30);
  const base = Math.min((+x.basic || 0) + (+x.house || 0), s.cap);
  const ge = x.nat === "S" ? (base * s.sEmp) / 100 : 0;
  const gr = (base * (x.nat === "S" ? s.sEr : s.nEr)) / 100;
  return { x, g, ot, ab, otp, abd, ge, gr, loan, reimb, net: g + otp - abd - ge - loan + reimb };
}

// مكافأة نهاية الخدمة (المادتان 84 و85): نصف شهر لأول 5 سنوات وشهر بعدها، مع تخفيض الاستقالة
export function eosb(wage: number, start: string, end: string, reason: "end" | "resign") {
  const y = (new Date(end).getTime() - new Date(start).getTime()) / 31557600000;
  if (!(y > 0)) return { y: 0, full: 0, amt: 0 };
  const full = y <= 5 ? (y * wage) / 2 : 2.5 * wage + (y - 5) * wage;
  const f = reason === "resign" ? (y < 2 ? 0 : y < 5 ? 1 / 3 : y < 10 ? 2 / 3 : 1) : 1;
  return { y, full, amt: full * f };
}

// النطاقات: الحدود تُدخل من المستخدم لأنها تختلف حسب النشاط والحجم
export function nitaqat(total: number, saudis: number, th: number[]) {
  const names = ["بلاتيني", "أخضر مرتفع", "أخضر متوسط", "أخضر منخفض"];
  const r = (saudis / total) * 100;
  const i = th.findIndex((p) => r >= p);
  const next = i < 0 ? { name: names[3], p: th[3] } : i > 0 ? { name: names[i - 1], p: th[i - 1] } : null;
  const need = next ? Math.max(0, Math.ceil(((next.p / 100) * total - saudis) / (1 - next.p / 100))) : 0;
  return { r, band: i < 0 ? "أحمر / أصفر" : names[i], next, need };
}

// قسط السلف المستحق خصمه في شهر معين (YYYY-MM): الأقساط تبدأ من شهر البداية وتتوقف عند سداد المبلغ
export function loanDue(loans: Row[], empId: any, ym: string) {
  let t = 0;
  for (const l of loans) {
    if (l.employee_id != empId || l.status !== "معتمد" || !/^\d{4}-\d{2}$/.test(l.start_month || "") || !(+l.installment > 0)) continue;
    const [sy, sm] = l.start_month.split("-").map(Number), [y, m] = ym.split("-").map(Number), idx = (y - sy) * 12 + (m - sm);
    if (idx < 0) continue;
    const paid = +l.installment * idx;
    if (paid < +l.amount) t += Math.min(+l.installment, +l.amount - paid);
  }
  return t;
}
// ساعات العمل الإضافي المعتمدة في شهر
export const otFor = (reqs: Row[], empId: any, ym: string) => reqs.filter((r) => r.kind === "عمل إضافي" && r.status === "معتمد" && r.compensation !== "رصيد تعويضي" && r.employee_id == empId && String(r.req_date || "").startsWith(ym)).reduce((a, r) => a + (+r.hours || 0), 0);
// المسافة بالمتر بين نقطتين (Haversine)
export function distM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000, rad = (x: number) => (x * Math.PI) / 180, dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export const hijri = (d = new Date()) => d.toLocaleDateString("ar-SA-u-ca-islamic", { day: "numeric", month: "long", year: "numeric" });

// تعويضات المصروفات المعتمدة التي لم تُصرف بعد
export const reimbFor = (exps: Row[], empId: any) => exps.filter((e) => e.employee_id == empId && e.status === "معتمد" && e.reimburse !== false && !e.paid_in).reduce((a, e) => a + (+e.amount || 0), 0);

// بداية الدوام ليوم معيّن: موسم (رمضان/صيف) إن وُجد وإلا الافتراضي
export function shiftStartFor(day: string, def: string, seasons: Row[]) {
  const s = seasons.find((x) => x.shift_start && x.from_date <= day && day <= x.to_date);
  return s ? String(s.shift_start).slice(0, 5) : def;
}
export const dayOfWeek = (day: string) => new Date(day + "T00:00:00").getDay();

// المناوبة المسندة لموظف في يوم معيّن (آخر إسناد ساري)
export function shiftFor(d: Record<string, Row[]>, empId: any, day: string): Row | undefined {
  const a = (d.shift_assign || []).filter((x) => x.employee_id == empId && x.from_date <= day && (!x.until_date || day <= x.until_date)).sort((p, q) => String(q.from_date).localeCompare(String(p.from_date)))[0];
  return a ? (d.shifts || []).find((s) => s.id == a.shift_id) : undefined;
}
// وقت اعتبار الدخول تأخيرًا: من المناوبة المسندة (مع دقائق المرونة)، وإلا الموسم، وإلا الافتراضي
export function lateAfter(d: Record<string, Row[]>, defStart: string, empId: any, day: string) {
  const sh = shiftFor(d, empId, day);
  if (sh?.kind === "مفتوحة") return "23:59";
  if (sh?.start_time) return addMin(String(sh.start_time).slice(0, 5), +sh.flex_minutes > 0 ? +sh.flex_minutes : 15);
  return addMin(shiftStartFor(day, defStart, d.seasons || []), 15);
}
// ساعات العمل المطلوبة يوميًا من المناوبة (طول الدوام ناقص الاستراحة) وإلا 8
export function requiredHours(d: Record<string, Row[]>, empId: any, day: string) {
  const sh = shiftFor(d, empId, day);
  if (sh?.kind === "مفتوحة" && +sh.required_hours > 0) return +sh.required_hours;
  if (sh?.start_time && sh?.end_time) {
    const m = (t: string) => { const [h, mi] = String(t).split(":").map(Number); return h * 60 + mi; };
    let len = m(sh.end_time) - m(sh.start_time); if (len <= 0) len += 1440;
    if (sh.break_start && sh.break_end) len -= Math.max(0, m(sh.break_end) - m(sh.break_start));
    return len / 60;
  }
  return 8;
}
