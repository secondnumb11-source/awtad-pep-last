// @ts-nocheck -- loose rows, matches the Awtad code style
// قواعد الخدمات الذاتية وفق نظام العمل السعودي وأنظمة الجوازات (قابلة للاختبار)
type Row = Record<string, any>;

/** عدد الأيام شاملًا يومي البداية والنهاية؛ 0 إذا كانت المدخلات غير صالحة. */
export function daysBetween(from?: string, to?: string): number {
  if (!from || !to) return 0;
  const d = Math.round((+new Date(to) - +new Date(from)) / 86400000) + 1;
  return Number.isFinite(d) ? d : 0;
}

/** الإجازة السنوية: 21 يومًا، و30 يومًا بعد 5 سنوات خدمة (م.109)، أو ما يحدده العقد. */
export function annualEntitlement(emp: Row, leaves: Row[], now = new Date()) {
  const years = emp.join_date ? (+now - +new Date(emp.join_date)) / 31557600000 : 0;
  const quota = +emp.annual_leave_days > 0 ? +emp.annual_leave_days : years >= 5 ? 30 : 21;
  const y = String(now.getFullYear());
  const used = leaves
    .filter((l) => l.employee_id === emp.id && l.type === "سنوية" && l.status === "معتمدة" && String(l.from_date || "").startsWith(y))
    .reduce((a, l) => a + (+l.days || 0), 0);
  return { quota, used, balance: Math.max(quota - used, 0) };
}

/** الحدود النظامية لكل نوع إجازة بالأيام (null = بلا حد ثابت). */
const LIMITS: Record<string, number> = { زواج: 5, وفاة: 5, مولود: 3, أمومة: 70, حج: 15, عدة: 130, مرضية: 120 };
export const leaveLimit = (type?: string): number | null => (type && LIMITS[type]) || null;

/** رسوم تأشيرة الخروج والعودة التقديرية: مفردة 200 لشهرين +100 لكل شهر إضافي، متعددة 500 لثلاثة أشهر +200 لكل شهر إضافي. */
export function exitReentryFee(kind?: string, days = 0): number {
  if (!kind || days <= 0) return 0;
  const months = Math.ceil(days / 30);
  if (kind === "متعددة") return 500 + Math.max(months - 3, 0) * 200;
  return 200 + Math.max(months - 2, 0) * 100;
}

/** قسط السلفة لا يتجاوز 10% من الأجر (م.92). */
export function loanCheck(amount: number, months: number, wage: number) {
  const installment = amount > 0 && months > 0 ? Math.round((amount / months) * 100) / 100 : 0;
  const max = Math.round(wage * 0.1 * 100) / 100;
  return { installment, max, ok: installment > 0 && installment <= max };
}
