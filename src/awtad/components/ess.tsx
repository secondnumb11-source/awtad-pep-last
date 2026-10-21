// @ts-nocheck -- matches the ported Awtad code style (loose TS)
// بوابة الموظف الذاتية (ESS): الملف الكامل، البصمة الإلكترونية، الخدمات الذاتية، طلباتي، صندوق الاعتمادات.
import { ReactNode, useEffect, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { sb, T, getOrg } from "@/awtad/lib/supabase";
import { sendMail } from "@/awtad/lib/mail";
import { Row, gross, hijri, n, today } from "@/awtad/lib/calc";
import { Ic } from "./Icons";
import { Payslip } from "./portal";
import { annualEntitlement, daysBetween, exitReentryFee, leaveLimit, loanCheck } from "@/awtad/lib/ess-rules";

// ---------- اللغة ----------
type Lang = "ar" | "en";
type L2 = [string, string];
const LS = "awtad_ess_lang";
function useLang() {
  const [lang, setLang] = useState<Lang>("ar");
  useEffect(() => { const v = localStorage.getItem(LS); if (v === "en" || v === "ar") setLang(v); }, []);
  const set = (l: Lang) => { setLang(l); localStorage.setItem(LS, l); };
  const t = (x: L2 | string) => (typeof x === "string" ? x : lang === "ar" ? x[0] : x[1]);
  return { lang, set, t };
}

const STAGE: Record<string, L2> = { manager: ["المدير المباشر", "Line manager"], hr: ["الموارد البشرية", "Human Resources"], accounts: ["الحسابات", "Finance"], done: ["مكتمل", "Completed"], rejected: ["مرفوض", "Rejected"] };
const STATUS: Record<string, L2> = { pending: ["قيد المتابعة", "In progress"], approved: ["Approved — معتمد", "Approved"], rejected: ["مرفوض", "Rejected"] };

// ---------- تعريف الخدمات ----------
type Opt = [string, string, string]; // [value, ar, en]
type F = { k: string; l: L2; t: "text" | "number" | "date" | "select" | "textarea" | "check" | "file"; opts?: Opt[] | ((emp: Row) => Opt[]); req?: boolean | ((v: Row) => boolean); show?: (v: Row, emp: Row) => boolean; hint?: L2; min?: number };
type Svc = { key: string; title: L2; desc: L2; icon: string; flow: string[]; fields: F[]; validate?: (v: Row, emp: Row, d: Record<string, Row[]>) => L2 | null; amount?: (v: Row, emp: Row) => number | null; info?: (v: Row, emp: Row, d: Record<string, Row[]>, t: (x: L2) => string) => ReactNode; titleOf?: (v: Row) => string };

const YN: Opt[] = [["نعم", "نعم", "Yes"], ["لا", "لا", "No"]];
const PAYER: Opt[] = [["الشركة", "على حساب الشركة", "Company"], ["الموظف", "على حسابي الشخصي", "Employee"]];
const REL: Opt[] = [["الزوجة", "الزوجة", "Wife"], ["ابن", "ابن", "Son"], ["ابنة", "ابنة", "Daughter"]];
const LEAVE_TYPES = (emp: Row): Opt[] => ([
  ["سنوية", "سنوية", "Annual"], ["عارضة", "عارضة (اضطرارية)", "Casual / emergency"], ["مرضية", "مرضية", "Sick"],
  ["زواج", "زواج (5 أيام)", "Marriage (5 days)"], ["وفاة", "وفاة قريب (5 أيام)", "Bereavement (5 days)"],
  ...(emp.gender !== "أنثى" ? [["مولود", "مولود للأب (3 أيام)", "Paternity (3 days)"] as Opt] : []),
  ...(emp.gender !== "ذكر" ? [["أمومة", "وضع / أمومة (10 أسابيع)", "Maternity (10 weeks)"] as Opt, ["عدة", "عدة وفاة الزوج", "Iddah"] as Opt] : []),
  ["حج", "حج (مرة واحدة)", "Hajj (once)"], ["امتحانات", "امتحانات", "Exams"], ["بدون راتب", "بدون راتب", "Unpaid"], ["غياب بعذر", "غياب بعذر", "Excused absence"],
]);
const fileReq = (k: string): F => ({ k, l: ["المستند المؤيد", "Supporting document"], t: "file", req: true });

export const SERVICES: Svc[] = [
  { key: "leave", icon: "cal", title: ["التوقيت والإجازات", "Time & Leave"], desc: ["طلب إجازة أو غياب بعذر", "Request leave or excused absence"], flow: ["manager", "hr"],
    fields: [
      { k: "leave_type", l: ["نوع الإجازة", "Leave type"], t: "select", opts: LEAVE_TYPES, req: true },
      { k: "from", l: ["من تاريخ", "From"], t: "date", req: true }, { k: "to", l: ["إلى تاريخ", "To"], t: "date", req: true },
      { k: "file", l: ["التقرير الطبي (صحتي / مستشفى معتمد)", "Medical report"], t: "file", req: true, show: (v) => v.leave_type === "مرضية" },
      { k: "file", l: ["مستند مؤيد (اختياري)", "Supporting document (optional)"], t: "file", show: (v) => ["زواج", "وفاة", "مولود", "أمومة", "عدة", "امتحانات", "غياب بعذر"].includes(v.leave_type) },
      { k: "where", l: ["مكان قضاء الإجازة", "Where"], t: "select", opts: [["داخل المملكة", "داخل المملكة", "Inside KSA"], ["خارج المملكة", "خارج المملكة", "Outside KSA"]], req: true, show: (v) => v.leave_type === "سنوية" },
      { k: "country", l: ["الدولة / الوجهة", "Destination"], t: "text", req: true, show: (v) => v.where === "خارج المملكة" },
      { k: "need_visa", l: ["هل تحتاج تأشيرة خروج وعودة؟", "Need exit re-entry visa?"], t: "select", opts: YN, req: true, show: (v) => v.where === "خارج المملكة" },
      { k: "visa_payer", l: ["رسوم التأشيرة", "Visa fees paid by"], t: "select", opts: PAYER, req: true, show: (v) => v.where === "خارج المملكة" && v.need_visa === "نعم" },
      { k: "ticket", l: ["هل تحتاج تذكرة طيران؟", "Need a flight ticket?"], t: "select", opts: YN, show: (v) => v.where === "خارج المملكة" },
      { k: "dependents", l: ["مرافقون من التابعين", "Accompanying dependents"], t: "text", show: (v) => v.where === "خارج المملكة", hint: ["أسماء المرافقين إن وجدوا", "Names, if any"] },
      { k: "delegate", l: ["الموظف البديل أثناء الإجازة", "Covering colleague"], t: "text" },
      { k: "contact", l: ["رقم التواصل أثناء الإجازة", "Contact number during leave"], t: "text" },
      { k: "notes", l: ["ملاحظات", "Notes"], t: "textarea" },
    ],
    validate: (v, emp, d) => {
      const days = daysBetween(v.from, v.to); if (days <= 0) return ["تاريخ النهاية قبل البداية", "End date is before start date"];
      if (v.leave_type === "سنوية") { const bal = annualEntitlement(emp, d.leaves || []).balance; if (days > bal) return [`الرصيد المتاح ${bal} يوم فقط`, `Only ${bal} days available`]; }
      const lim = leaveLimit(v.leave_type); if (lim && days > lim) return [`الحد النظامي لهذا النوع ${lim} يوم`, `Statutory limit for this type is ${lim} days`];
      return null;
    },
    info: (v, emp, d, t) => { const days = daysBetween(v.from, v.to), b = annualEntitlement(emp, d.leaves || []); return <div className="ess-note">{days > 0 && <b>{t(["عدد الأيام: ", "Days: "])}{days}</b>} {v.leave_type === "سنوية" && <span> · {t(["الرصيد المتاح: ", "Available balance: "])}{b.balance}</span>}{v.leave_type === "مرضية" && <span> · {t(["نظام العمل م.117: 30 يومًا بأجر كامل ثم 60 بثلاثة أرباع الأجر ثم 30 بدون أجر خلال السنة", "Labor Law Art.117: 30 days full pay, 60 at 75%, 30 unpaid per year"])}</span>}</div>; },
    titleOf: (v) => `إجازة ${v.leave_type || ""} ${v.from || ""} → ${v.to || ""}` },

  { key: "dependents", icon: "users", title: ["إضافة تابع على الإقامة", "Add dependent to Iqama"], desc: ["إضافة زوجة أو أبناء", "Add wife or children"], flow: ["manager", "hr"],
    fields: [
      { k: "relation", l: ["صلة القرابة", "Relationship"], t: "select", opts: REL, req: true },
      { k: "name_ar", l: ["الاسم الكامل (عربي)", "Full name (Arabic)"], t: "text", req: true }, { k: "name_en", l: ["الاسم كما في الجواز (إنجليزي)", "Name as in passport"], t: "text", req: true },
      { k: "birth", l: ["تاريخ الميلاد", "Date of birth"], t: "date", req: true }, { k: "nationality", l: ["الجنسية", "Nationality"], t: "text", req: true },
      { k: "passport", l: ["رقم الجواز", "Passport no."], t: "text", req: true }, { k: "passport_exp", l: ["انتهاء الجواز", "Passport expiry"], t: "date", req: true },
      { k: "border", l: ["رقم الحدود / التأشيرة (إن وجد)", "Border / visa no. (if any)"], t: "text" },
      { k: "inside", l: ["هل التابع داخل المملكة؟", "Is the dependent in KSA?"], t: "select", opts: YN, req: true },
      { k: "file", l: ["عقد الزواج / شهادة الميلاد مصدّقة", "Attested marriage / birth certificate"], t: "file", req: true },
      { k: "notes", l: ["ملاحظات", "Notes"], t: "textarea" },
    ], titleOf: (v) => `إضافة ${v.relation || "تابع"}: ${v.name_ar || ""}` },

  { key: "bank", icon: "wal", title: ["تغيير الحساب البنكي", "Change bank account"], desc: ["تحديث الآيبان لصرف الراتب", "Update salary IBAN"], flow: ["hr"],
    fields: [
      { k: "bank", l: ["اسم البنك", "Bank"], t: "select", req: true, opts: ["الراجحي", "الأهلي SNB", "الرياض", "ساب SAB", "البلاد", "الإنماء", "العربي الوطني", "الجزيرة", "السعودي الفرنسي", "الاستثمار", "stc bank", "D360"].map((b) => [b, b, b] as Opt) },
      { k: "iban", l: ["رقم الآيبان", "IBAN"], t: "text", req: true, hint: ["SA متبوعة بـ 22 رقمًا", "SA followed by 22 digits"] },
      { k: "holder", l: ["اسم صاحب الحساب", "Account holder"], t: "text", req: true },
      { k: "file", l: ["شهادة الآيبان من البنك", "IBAN certificate"], t: "file", req: true },
    ],
    validate: (v, emp) => { const x = String(v.iban || "").replace(/\s/g, "").toUpperCase(); if (!/^SA\d{22}$/.test(x)) return ["رقم الآيبان غير صحيح", "Invalid Saudi IBAN"]; v.iban = x; return null; },
    titleOf: (v) => `تغيير الحساب إلى ${v.bank || ""}` },

  { key: "visit", icon: "plane", title: ["طلب زيارة عائلية", "Family visit visa"], desc: ["خطاب لطلب تأشيرة زيارة", "Letter for family visit visa"], flow: ["manager", "hr"],
    fields: [
      { k: "visitors", l: ["أسماء الزوار", "Visitors' names"], t: "textarea", req: true }, { k: "relation", l: ["صلة القرابة", "Relationship"], t: "text", req: true },
      { k: "count", l: ["عدد الزوار", "Number of visitors"], t: "number", req: true, min: 1 }, { k: "nationality", l: ["الجنسية", "Nationality"], t: "text", req: true },
      { k: "kind", l: ["نوع الزيارة", "Visa type"], t: "select", opts: [["مفردة", "مفردة", "Single"], ["متعددة", "متعددة", "Multiple"]], req: true },
      { k: "months", l: ["المدة (أشهر)", "Duration (months)"], t: "number", req: true, min: 1 }, { k: "notes", l: ["ملاحظات", "Notes"], t: "textarea" },
    ], titleOf: (v) => `زيارة عائلية (${v.count || 1})` },

  { key: "iqama_renew", icon: "refresh", title: ["تجديد الإقامة", "Iqama renewal"], desc: ["تجديد إقامتك أو إقامة تابع", "Renew your or a dependent's iqama"], flow: ["manager", "hr"],
    fields: [
      { k: "for", l: ["لمن", "For"], t: "select", opts: [["نفسي", "نفسي", "Myself"], ...REL], req: true }, { k: "person", l: ["الاسم", "Name"], t: "text", show: (v) => v.for && v.for !== "نفسي", req: true },
      { k: "period", l: ["مدة التجديد", "Renewal period"], t: "select", opts: [["3", "3 أشهر", "3 months"], ["6", "6 أشهر", "6 months"], ["9", "9 أشهر", "9 months"], ["12", "سنة", "1 year"]], req: true },
      { k: "notes", l: ["ملاحظات", "Notes"], t: "textarea" },
    ], info: (v, emp, d, t) => emp.iqama_expiry ? <div className="ess-note">{t(["تنتهي إقامتك في ", "Your iqama expires on "])}<b>{emp.iqama_expiry}</b></div> : null,
    titleOf: (v) => `تجديد إقامة ${v.for === "نفسي" || !v.for ? "" : v.person || ""}` },

  { key: "iqama_print", icon: "doc", title: ["طباعة الإقامة", "Iqama print"], desc: ["إصدار بدل فاقد أو تالف", "Lost / damaged replacement"], flow: ["manager", "hr"],
    fields: [
      { k: "reason", l: ["السبب", "Reason"], t: "select", opts: [["فقدان", "فقدان", "Lost"], ["تلف", "تلف", "Damaged"], ["تحديث بيانات", "تحديث بيانات", "Data update"]], req: true },
      { k: "for", l: ["لمن", "For"], t: "select", opts: [["نفسي", "نفسي", "Myself"], ...REL], req: true },
      { k: "file", l: ["بلاغ الفقدان (أبشر)", "Loss report (Absher)"], t: "file", req: true, show: (v) => v.reason === "فقدان" },
    ], info: (v, emp, d, t) => <div className="ess-note">{t(["رسوم بدل فاقد الإقامة 500 ريال، وتتضاعف عند التكرار، وفق أنظمة الجوازات", "Lost iqama replacement fee is SAR 500 and doubles on repeat, per Jawazat rules"])}</div>,
    titleOf: (v) => `طباعة إقامة — ${v.reason || ""}` },

  { key: "exit_reentry", icon: "plane", title: ["تأشيرة خروج وعودة", "Exit re-entry visa"], desc: ["مفردة أو متعددة", "Single or multiple"], flow: ["manager", "hr"],
    fields: [
      { k: "kind", l: ["نوع التأشيرة", "Visa type"], t: "select", opts: [["مفردة", "مفردة", "Single"], ["متعددة", "متعددة", "Multiple"]], req: true },
      { k: "from", l: ["تاريخ السفر", "Travel date"], t: "date", req: true }, { k: "to", l: ["تاريخ العودة المتوقع", "Expected return"], t: "date", req: true },
      { k: "reason", l: ["سبب السفر", "Reason"], t: "select", opts: [["إجازة سنوية", "إجازة سنوية", "Annual leave"], ["ظرف عائلي", "ظرف عائلي", "Family matter"], ["علاج", "علاج", "Medical"], ["مهمة عمل", "مهمة عمل", "Business"], ["أخرى", "أخرى", "Other"]], req: true },
      { k: "destination", l: ["الوجهة", "Destination"], t: "text", req: true },
      { k: "payer", l: ["رسوم التأشيرة", "Fees paid by"], t: "select", opts: PAYER, req: true },
      { k: "ticket", l: ["هل تحتاج تذكرة طيران؟", "Need a flight ticket?"], t: "select", opts: YN, req: true },
      { k: "ticket_class", l: ["درجة التذكرة", "Ticket class"], t: "select", opts: [["سياحية", "سياحية", "Economy"], ["أعمال", "أعمال", "Business"]], show: (v) => v.ticket === "نعم" },
      { k: "dependents", l: ["تشمل التابعين (أسماؤهم)", "Include dependents (names)"], t: "text" },
      { k: "passport_ok", l: ["أؤكد أن جوازي ساري لأكثر من 3 أشهر وإقامتي سارية", "I confirm my passport is valid 3+ months and iqama is valid"], t: "check", req: true },
    ],
    validate: (v) => (daysBetween(v.from, v.to) <= 0 ? ["تاريخ العودة قبل السفر", "Return date is before travel date"] : null),
    info: (v, emp, d, t) => { const fee = exitReentryFee(v.kind, daysBetween(v.from, v.to)); return fee ? <div className="ess-note">{t(["الرسوم التقديرية للجوازات: ", "Estimated Jawazat fee: "])}<b>{n(fee)} {t(["ر.س", "SAR"])}</b></div> : null; },
    titleOf: (v) => `خروج وعودة ${v.kind || ""} ${v.from || ""}` },

  { key: "passport", icon: "file", title: ["تعديل بيانات الجواز", "Update passport details"], desc: ["لك أو للزوجة أو الأبناء", "For you, wife or children"], flow: ["hr"],
    fields: [
      { k: "for", l: ["لمن", "For"], t: "select", opts: [["نفسي", "نفسي", "Myself"], ...REL], req: true }, { k: "person", l: ["الاسم", "Name"], t: "text", req: true, show: (v) => v.for && v.for !== "نفسي" },
      { k: "passport", l: ["رقم الجواز الجديد", "New passport no."], t: "text", req: true }, { k: "issue", l: ["تاريخ الإصدار", "Issue date"], t: "date", req: true },
      { k: "expiry", l: ["تاريخ الانتهاء", "Expiry date"], t: "date", req: true }, { k: "place", l: ["جهة الإصدار", "Place of issue"], t: "text", req: true }, fileReq("file"),
    ], validate: (v) => (v.expiry && v.issue && v.expiry <= v.issue ? ["تاريخ الانتهاء قبل الإصدار", "Expiry is before issue date"] : null),
    titleOf: (v) => `تحديث جواز ${v.for === "نفسي" || !v.for ? "" : v.person || ""}` },

  { key: "loan", icon: "wal", title: ["طلب سلفة", "Salary advance (loan)"], desc: ["سلفة تُسدّد على أقساط شهرية", "Repaid in monthly installments"], flow: ["hr", "accounts"],
    fields: [
      { k: "amount", l: ["المبلغ (ر.س)", "Amount (SAR)"], t: "number", req: true, min: 1 }, { k: "months", l: ["عدد الأقساط (أشهر)", "Installments (months)"], t: "number", req: true, min: 1 },
      { k: "start_month", l: ["شهر بداية الخصم", "First deduction month"], t: "text", hint: ["YYYY-MM", "YYYY-MM"] }, { k: "reason", l: ["سبب الطلب", "Reason"], t: "textarea", req: true },
    ],
    amount: (v) => +v.amount || null,
    validate: (v, emp) => { if (v.start_month && !/^\d{4}-\d{2}$/.test(v.start_month)) return ["صيغة الشهر YYYY-MM", "Month format is YYYY-MM"]; const c = loanCheck(+v.amount, +v.months, gross(emp)); return c.ok ? null : [`القسط ${n(c.installment)} يتجاوز 10% من الأجر (${n(c.max)}) وفق المادة 92 من نظام العمل`, `Installment ${n(c.installment)} exceeds 10% of wage (${n(c.max)}) per Labor Law Art. 92`]; },
    info: (v, emp, d, t) => { const c = loanCheck(+v.amount, +v.months, gross(emp)); return +v.amount > 0 && +v.months > 0 ? <div className={"ess-note" + (c.ok ? "" : " bad")}>{t(["القسط الشهري: ", "Monthly installment: "])}<b>{n(c.installment)}</b> · {t(["الحد الأعلى للقسط: ", "Max installment: "])}{n(c.max)}</div> : null; },
    titleOf: (v) => `سلفة ${n(+v.amount || 0)} ر.س على ${v.months || 1} شهر` },

  { key: "housing", icon: "home", title: ["صرف بدل سكن مقدّم", "Housing allowance advance"], desc: ["دفعة مقدمة من بدل السكن", "Advance on housing allowance"], flow: ["hr", "accounts"],
    fields: [
      { k: "months", l: ["عدد الأشهر المقدّمة", "Months in advance"], t: "select", req: true, opts: ["3", "6", "12"].map((m) => [m, `${m} أشهر`, `${m} months`] as Opt) },
      { k: "lease_end", l: ["تاريخ انتهاء عقد الإيجار", "Lease end date"], t: "date" }, { k: "file", l: ["عقد الإيجار (إيجار) — اختياري", "Ejar lease (optional)"], t: "file" },
      { k: "reason", l: ["ملاحظات", "Notes"], t: "textarea" },
    ],
    amount: (v, emp) => (+emp.house || 0) * (+v.months || 0) || null,
    validate: (v, emp) => (!(+emp.house > 0) ? ["لا يوجد بدل سكن نقدي في عقدك", "No cash housing allowance in your contract"] : null),
    info: (v, emp, d, t) => <div className="ess-note">{t(["بدل السكن الشهري: ", "Monthly housing: "])}<b>{n(+emp.house || 0)}</b>{+v.months > 0 && <> · {t(["المبلغ المطلوب: ", "Requested: "])}<b>{n((+emp.house || 0) * +v.months)} {t(["ر.س", "SAR"])}</b></>}</div>,
    titleOf: (v) => `بدل سكن مقدّم ${v.months || ""} أشهر` },

  { key: "bonus", icon: "award", title: ["مكافأة زواج / مولود", "Marriage / birth bonus"], desc: ["حسب ما ينص عليه عقدك", "As stated in your contract"], flow: ["hr", "accounts"],
    fields: [
      { k: "kind", l: ["نوع المكافأة", "Bonus type"], t: "select", opts: [["زواج", "زواج", "Marriage"], ["مولود", "مولود", "Birth"]], req: true },
      { k: "event_date", l: ["تاريخ المناسبة", "Event date"], t: "date", req: true }, { k: "person", l: ["اسم الزوجة / المولود", "Spouse / newborn name"], t: "text", req: true },
      { k: "file", l: ["عقد الزواج / شهادة الميلاد", "Marriage contract / birth certificate"], t: "file", req: true },
    ],
    amount: (v, emp) => (v.kind === "زواج" ? +emp.marriage_bonus : v.kind === "مولود" ? +emp.birth_bonus : 0) || null,
    validate: (v, emp) => { const a = v.kind === "زواج" ? +emp.marriage_bonus : +emp.birth_bonus; return a > 0 ? null : ["هذه المكافأة غير منصوص عليها في عقدك", "This bonus is not included in your contract"]; },
    info: (v, emp, d, t) => { const a = v.kind === "زواج" ? +emp.marriage_bonus : v.kind === "مولود" ? +emp.birth_bonus : 0; return v.kind ? <div className={"ess-note" + (a > 0 ? "" : " bad")}>{a > 0 ? <>{t(["المبلغ المستحق وفق العقد: ", "Contract amount: "])}<b>{n(a)} {t(["ر.س", "SAR"])}</b></> : t(["غير متاحة في عقدك — تواصل مع الموارد البشرية", "Not available in your contract — contact HR"])}</div> : null; },
    titleOf: (v) => `مكافأة ${v.kind || ""}` },
];
const SVC = Object.fromEntries(SERVICES.map((s) => [s.key, s]));
const LETTER_TITLE: L2 = ["خطاب تعريفي / مسير راتب", "Introduction letter / Salary slip"];
const ATTEST_TITLE: L2 = ["تعميد الغرفة التجارية", "Chamber of Commerce attestation"];
const ATTEST_FEE = 35;
const svcTitle = (k: string, t: (x: L2) => string) => (k === "letter" ? t(LETTER_TITLE) : k === "attest" ? t(ATTEST_TITLE) : SVC[k] ? t(SVC[k].title) : k);

// ---------- أدوات ----------
async function uploadEss(empId: number, file: File, folder = "ess") {
  if (file.size > 10 * 1024 * 1024) throw new Error("الحد الأقصى للملف 10 ميغابايت / Max 10MB");
  const ext = (file.name.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const path = `${getOrg()}/${empId}/${folder}/${Date.now()}.${ext}`;
  const up = await sb.storage.from("awtad-docs").upload(path, file, { contentType: file.type || undefined });
  if (up.error) throw new Error(up.error.message);
  return path;
}
async function openPath(path: string) { const { data, error } = await sb.storage.from("awtad-docs").createSignedUrl(path, 120); if (error || !data) return alert(error?.message || "تعذّر فتح الملف"); window.open(data.signedUrl, "_blank"); }
function notifyMail(list: any, subject: string, body: string) {
  const to = (Array.isArray(list) ? list : []).map((x) => x.email).filter(Boolean);
  if (!to.length) return;
  const link = `${window.location.origin}/ess-inbox`;
  sendMail(to, subject, `<div dir="rtl" style="font-family:Arial;line-height:1.8"><h3>${subject}</h3><p>${body}</p><p><a href="${link}">فتح صندوق الاعتمادات</a></p></div>`).catch(() => {});
}
function useMe() {
  const { d } = useData(); const { user } = useAuth();
  return { user, emp: (d.employees || []).find((x) => x.id === user?.employeeId) as Row | undefined };
}
function usePhoto(path?: string) {
  const [url, setUrl] = useState("");
  useEffect(() => { let on = true; if (!path) { setUrl(""); return; } sb.storage.from("awtad-docs").createSignedUrl(path, 3600).then(({ data }) => on && setUrl(data?.signedUrl || "")); return () => { on = false; }; }, [path]);
  return url;
}
const initials = (s = "") => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");
function expiry(date?: string) { if (!date) return { cls: "", left: null }; const left = Math.ceil((+new Date(date) - +new Date(today())) / 86400000); return { cls: left < 0 ? "bad" : left <= 60 ? "warn" : "good", left }; }
function SetupNotice({ t }: { t: (x: L2) => string }) {
  return <div className="card ess-setup"><h2>{t(["خطوة إعداد واحدة مطلوبة", "One setup step required"])}</h2><p className="mut">{t(["لتفعيل الخدمات الذاتية يجب تشغيل ملف التحديث مرة واحدة في محرر SQL بقاعدة بياناتك.", "To enable self services, run the update file once in your database SQL editor."])}</p><a className="btn" href="/awtad_17_self_services.sql" download>{t(["تنزيل ملف التحديث", "Download update file"])}</a></div>;
}

// ---------- البوابة ----------
export function EssPortal() {
  const { d, err, company } = useData();
  const { user, emp } = useMe();
  const L = useLang(), { t, lang } = L;
  const [tab, setTab] = useState("profile");
  const photo = usePhoto(emp?.photo_path);
  if (!emp) return <div className="card"><h2>{t(["بوابة الموظف", "Employee portal"])}</h2><div className="mut">{t(["حسابك غير مرتبط بسجل موظف. اطلب من مدير النظام ربط حسابك.", "Your account is not linked to an employee record. Ask your administrator to link it."])}</div></div>;
  const canApprove = ["admin", "hr", "manager", "accountant"].includes(user?.role || "") || (d.employees || []).some((x) => x.manager_id === emp.id);
  const pendingMine = (d.ess_requests || []).filter((r) => r.employee_id === emp.id && r.status === "pending").length;
  const tabs: [string, L2, string][] = [["profile", ["ملفي", "My profile"], "users"], ["punch", ["البصمة", "Attendance"], "clock"], ["services", ["Self Services", "Self Services"], "layers"], ["mine", ["طلباتي", "My requests"], "doc"], ...(canApprove ? [["inbox", ["الاعتمادات", "Approvals"], "flow"] as [string, L2, string]] : [])];
  return (
    <div className="ess" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
      <div className="ess-hero">
        <div className="ess-avatar">{photo ? <img src={photo} alt={emp.name} /> : <span>{initials(lang === "en" && emp.name_en ? emp.name_en : emp.name)}</span>}</div>
        <div className="ess-id">
          <small>{company?.name_ar || ""}</small>
          <h1>{lang === "en" && emp.name_en ? emp.name_en : emp.name}</h1>
          <div>{(lang === "en" && emp.job_en) || emp.job || "—"} · {emp.dept || "—"}</div>
        </div>
        <div className="ess-hero-side">
          <div className="ess-lang"><button className={lang === "ar" ? "on" : ""} onClick={() => L.set("ar")}>العربية</button><button className={lang === "en" ? "on" : ""} onClick={() => L.set("en")}>English</button></div>
          <div className="ess-kpis"><div><b>{annualEntitlement(emp, d.leaves || []).balance}</b><span>{t(["يوم رصيد", "leave days"])}</span></div><div><b>{pendingMine}</b><span>{t(["طلب قائم", "open requests"])}</span></div></div>
        </div>
      </div>
      <div className="tabs ess-tabs">{tabs.map(([k, l, ic]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}><Ic n={ic} s={16} /> {t(l)}</button>)}</div>
      <div className="tabpanel" key={tab}>
        {err.ess_requests && tab !== "profile" && tab !== "punch" ? <SetupNotice t={t} /> : <>
          {tab === "profile" && <Profile emp={emp} t={t} />}
          {tab === "punch" && <Punch emp={emp} t={t} />}
          {tab === "services" && <Services emp={emp} t={t} lang={lang} onDone={() => setTab("mine")} />}
          {tab === "mine" && <MyRequests emp={emp} t={t} />}
          {tab === "inbox" && <Inbox t={t} />}
        </>}
      </div>
    </div>
  );
}

// ---------- ملفي ----------
function Profile({ emp, t }: { emp: Row; t: (x: L2) => string }) {
  const { d } = useData();
  const ent = annualEntitlement(emp, d.leaves || []);
  const mgr = (d.employees || []).find((x) => x.id === emp.manager_id);
  const Exp = ({ v }: { v?: string }) => { const e = expiry(v); return v ? <span className={"ess-exp " + e.cls}>{v}{e.left != null && <em>{e.left < 0 ? t(["منتهية", "expired"]) : `${e.left} ${t(["يوم", "days"])}`}</em>}</span> : <>—</>; };
  const groups: [L2, [L2, any][]][] = [
    [["البيانات الشخصية", "Personal"], [[["الاسم", "Name"], emp.name], [["الاسم بالإنجليزية", "Name (English)"], emp.name_en], [["تاريخ الميلاد", "Date of birth"], emp.birth_date], [["الجنس", "Gender"], emp.gender], [["الجنسية", "Nationality"], emp.nationality], [["الحالة الاجتماعية", "Marital status"], emp.marital_status], [["المؤهل", "Education"], emp.education], [["الجوال", "Mobile"], emp.phone], [["البريد", "Email"], emp.email], [["العنوان", "Address"], emp.address], [["جهة الطوارئ", "Emergency contact"], [emp.emergency_name, emp.emergency_phone].filter(Boolean).join(" — ")]]],
    [["الوظيفة والعقد", "Job & contract"], [[["الرقم الوظيفي", "Employee no."], emp.id], [["المسمى", "Job title"], emp.job], [["القسم", "Department"], emp.dept], [["المدير المباشر", "Line manager"], mgr?.name], [["نوع العقد", "Contract type"], emp.contract_type || emp.employment_type], [["رقم العقد على قوى", "Qiwa contract no."], emp.qiwa_contract_no], [["تاريخ المباشرة", "Join date"], emp.join_date], [["بداية العقد", "Contract start"], emp.contract_start], [["انتهاء العقد", "Contract end"], <Exp v={emp.contract_end} />], [["انتهاء التجربة", "Probation end"], emp.probation_end], [["رقم التأمينات", "GOSI no."], emp.gosi_no]]],
    [["الإقامة والجواز", "Iqama & passport"], [[["رقم الإقامة / الهوية", "Iqama / ID no."], emp.national_id], [["انتهاء الإقامة", "Iqama expiry"], <Exp v={emp.iqama_expiry} />], [["رخصة العمل", "Work permit"], <Exp v={emp.work_permit_expiry} />], [["رقم الجواز", "Passport no."], emp.passport_no], [["انتهاء الجواز", "Passport expiry"], <Exp v={emp.passport_expiry} />]]],
    [["التأمين الطبي", "Medical insurance"], [[["شركة التأمين", "Insurer"], emp.insurance_company], [["رقم البوليصة / العضوية", "Policy / member no."], emp.insurance_no], [["الفئة", "Class"], emp.insurance_class], [["تاريخ الانتهاء", "Expiry"], <Exp v={emp.health_insurance_expiry} />]]],
    [["الراتب والبنك", "Pay & bank"], [[["الأساسي", "Basic"], n(+emp.basic || 0)], [["بدل السكن", "Housing"], n(+emp.house || 0)], [["بدل النقل", "Transport"], n(+emp.trans || 0)], [["بدلات أخرى", "Other"], n(+emp.other || 0)], [["الإجمالي", "Gross"], n(gross(emp))], [["البنك", "Bank"], emp.bank_name], [["الآيبان", "IBAN"], emp.iban]]],
  ];
  return (<>
    <div className="ess-leave">
      {[[["الاستحقاق السنوي", "Annual entitlement"], ent.quota], [["المستخدم هذا العام", "Used this year"], ent.used], [["الرصيد المتاح", "Available"], ent.balance]].map(([l, v]: any, i) => <div key={i} className={"ess-stat" + (i === 2 ? " main" : "")}><span>{t(l)}</span><b>{v}</b><small>{t(["يوم", "days"])}</small></div>)}
      <div className="ess-stat"><span>{t(["التاريخ الهجري", "Hijri date"])}</span><b className="sm">{hijri()}</b></div>
    </div>
    <div className="ess-groups">{groups.map(([g, rows], gi) => <div className="card ess-group" key={gi}><h2>{t(g)}</h2><dl>{rows.map(([l, v], i) => <div key={i}><dt>{t(l)}</dt><dd dir="auto">{v === 0 ? 0 : v || "—"}</dd></div>)}</dl></div>)}</div>
    <div className="mut ess-foot">{t(["لتصحيح أي بيان استخدم الخدمات الذاتية أو تواصل مع الموارد البشرية.", "To correct any detail use Self Services or contact HR."])}</div>
  </>);
}

// ---------- البصمة الإلكترونية ----------
const b64 = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function deviceBiometric(empId: number) {
  if (!window.PublicKeyCredential || !navigator.credentials) throw new Error("bio-unsupported");
  const key = "awtad_bio_" + empId, challenge = crypto.getRandomValues(new Uint8Array(32)), saved = localStorage.getItem(key);
  if (!saved) {
    const c: any = await navigator.credentials.create({ publicKey: { challenge, rp: { name: "Awtad" }, user: { id: new TextEncoder().encode(String(empId)), name: "emp" + empId, displayName: "Employee " + empId }, pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }], authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }, timeout: 60000 } });
    localStorage.setItem(key, b64(c.rawId)); return;
  }
  await navigator.credentials.get({ publicKey: { challenge, allowCredentials: [{ type: "public-key", id: unb64(saved) }], userVerification: "required", timeout: 60000 } });
}
const distM = (a: number, b: number, c: number, e: number) => { const R = 6371000, r = Math.PI / 180, x = (c - a) * r, y = (e - b) * r, h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };

function Punch({ emp, t }: { emp: Row; t: (x: L2) => string }) {
  const { d, reload } = useData();
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState<[string, boolean] | null>(null), [bio, setBio] = useState(false), [now, setNow] = useState(new Date());
  useEffect(() => { setBio(localStorage.getItem("awtad_bio_on_" + emp.id) === "1"); const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, [emp.id]);
  const rec = (d.attendance || []).find((r) => r.employee_id === emp.id && r.day === today()) || {};
  const month = (d.attendance || []).filter((r) => r.employee_id === emp.id).sort((a, b) => (a.day < b.day ? 1 : -1));
  const locs = (d.locations || []).filter((l) => l.active && l.lat != null && l.lng != null);
  const geo = locs.length > 0 && !emp.remote_punch;
  async function punch(k: "check_in" | "check_out") {
    setBusy(true); setMsg(null);
    try {
      if (bio) { try { await deviceBiometric(emp.id); } catch (e: any) { throw new Error(e?.message === "bio-unsupported" ? t(["هذا الجهاز لا يدعم البصمة", "This device does not support biometrics"]) : t(["لم يتم التحقق بالبصمة", "Biometric verification failed"])); } }
      const extra: Row = {};
      const pos: GeolocationPosition | null = await new Promise((res, rej) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(res, (e) => (geo ? rej(e) : res(null)), { enableHighAccuracy: true, timeout: 15000 }) : geo ? rej({ code: 2 }) : res(null));
      if (pos) Object.assign(extra, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      if (geo && pos) {
        const best = locs.map((l) => ({ l, dist: distM(pos.coords.latitude, pos.coords.longitude, +l.lat, +l.lng) })).sort((a, b) => a.dist - b.dist)[0];
        if (best.dist > (+best.l.radius_m || 100)) throw new Error(t([`أنت خارج نطاق «${best.l.name}» بمسافة ${Math.round(best.dist)} م (المسموح ${best.l.radius_m} م)`, `You are outside "${best.l.name}" by ${Math.round(best.dist)} m (allowed ${best.l.radius_m} m)`]));
        Object.assign(extra, { location_id: best.l.id, in_range: true });
      }
      const { error } = await sb.from(T("attendance")).upsert({ org_id: getOrg(), employee_id: emp.id, day: today(), [k]: new Date().toTimeString().slice(0, 8), ...extra }, { onConflict: "employee_id,day" });
      if (error) throw new Error(error.message);
      setMsg([k === "check_in" ? t(["تم تسجيل الحضور", "Checked in"]) : t(["تم تسجيل الانصراف", "Checked out"]), true]); await reload();
    } catch (e: any) { setMsg([e?.code === 1 ? t(["اسمح للمتصفح بالوصول إلى موقعك ثم أعد المحاولة", "Allow location access and try again"]) : e?.message || t(["تعذّر التسجيل", "Could not record"]), false]); }
    finally { setBusy(false); }
  }
  const toggleBio = async () => { if (!bio) { try { await deviceBiometric(emp.id); } catch { return setMsg([t(["تعذّر تفعيل البصمة على هذا الجهاز", "Could not enable biometrics on this device"]), false]); } } localStorage.setItem("awtad_bio_on_" + emp.id, bio ? "0" : "1"); setBio(!bio); };
  return (<>
    <div className="card ess-punch">
      <div className="ess-clock"><b>{now.toLocaleTimeString("en-GB")}</b><span>{today()} · {hijri()}</span></div>
      <div className="ess-punch-btns">
        <button className="ess-pbtn in" disabled={busy || !!rec.check_in} onClick={() => punch("check_in")}><Ic n="clock" s={26} /><b>{t(["تسجيل حضور", "Check in"])}</b><span>{(rec.check_in || "").slice(0, 5) || "—"}</span></button>
        <button className="ess-pbtn out" disabled={busy || !rec.check_in || !!rec.check_out} onClick={() => punch("check_out")}><Ic n="out" s={26} /><b>{t(["تسجيل انصراف", "Check out"])}</b><span>{(rec.check_out || "").slice(0, 5) || "—"}</span></button>
      </div>
      {msg && <div className={msg[1] ? "ok" : "er"}>{msg[0]}</div>}
      <div className="ess-punch-meta">
        <span className="chip"><Ic n="pin" s={14} /> {geo ? t([`مقيّد بمواقع العمل (${locs.length})`, `Geofenced to ${locs.length} work site(s)`]) : t(["تسجيل من أي موقع (يُحفظ الموقع)", "Any location (position recorded)"])}</span>
        <button className={"chip ess-bio" + (bio ? " on" : "")} onClick={toggleBio}><Ic n="lock" s={14} /> {bio ? t(["البصمة مفعّلة على هذا الجهاز", "Biometric on for this device"]) : t(["تفعيل البصمة / Face ID", "Enable fingerprint / Face ID"])}</button>
      </div>
    </div>
    <div className="card scroll"><h2>{t(["سجل هذا الشهر", "This month"])}</h2><table><thead><tr><th>{t(["اليوم", "Day"])}</th><th>{t(["حضور", "In"])}</th><th>{t(["انصراف", "Out"])}</th><th>{t(["الموقع", "Location"])}</th></tr></thead><tbody>
      {month.map((r) => <tr key={r.id}><td>{r.day}</td><td>{(r.check_in || "").slice(0, 5) || "—"}</td><td>{(r.check_out || "").slice(0, 5) || "—"}</td><td>{r.lat != null ? <a className="ok" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">{r.in_range ? t(["ضمن النطاق", "In range"]) : t(["عرض", "View"])}</a> : "—"}</td></tr>)}
      {!month.length && <tr><td colSpan={4} className="mut">{t(["لا توجد سجلات", "No records"])}</td></tr>}</tbody></table></div>
  </>);
}

// ---------- الخدمات الذاتية ----------
function Services({ emp, t, lang, onDone }: { emp: Row; t: (x: L2) => string; lang: Lang; onDone: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const all = [...SERVICES.slice(0, 2), { key: "letter", icon: "file", title: LETTER_TITLE, desc: ["إصدار فوري وطلب تعميد الغرفة التجارية", "Instant issue + Chamber attestation"] }, ...SERVICES.slice(2)];
  if (open === "letter") return <LetterService emp={emp} t={t} lang={lang} back={() => setOpen(null)} onDone={onDone} />;
  if (open && SVC[open]) return <ServiceForm svc={SVC[open]} emp={emp} t={t} back={() => setOpen(null)} onDone={onDone} />;
  return <div className="ess-svc-grid">{all.map((s: any) => <button key={s.key} className="ess-svc" onClick={() => setOpen(s.key)}><i><Ic n={s.icon} s={22} /></i><b>{t(s.title)}</b><span>{t(s.desc)}</span></button>)}</div>;
}

function ServiceForm({ svc, emp, t, back, onDone }: { svc: Svc; emp: Row; t: (x: L2) => string; back: () => void; onDone: () => void }) {
  const { d, reload } = useData();
  const [v, setVs] = useState<Row>({}), [file, setFile] = useState<File | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const setV = (k: string, x: any) => setVs((o) => ({ ...o, [k]: x }));
  const visible = svc.fields.filter((f) => !f.show || f.show(v, emp));
  async function submit() {
    setMsg("");
    for (const f of visible) { const req = typeof f.req === "function" ? f.req(v) : f.req; if (!req) continue; if (f.t === "file" ? !file : f.t === "check" ? !v[f.k] : v[f.k] == null || String(v[f.k]).trim() === "") return setMsg(t(["أكمل الحقل: ", "Please complete: "]) + t(f.l)); if (f.t === "number" && f.min != null && +v[f.k] < f.min) return setMsg(t(f.l) + " ≥ " + f.min); }
    const bad = svc.validate?.(v, emp, d); if (bad) return setMsg(t(bad));
    setBusy(true);
    try {
      const fileField = visible.find((f) => f.t === "file");
      const path = fileField && file ? await uploadEss(emp.id, file) : null;
      const details = Object.fromEntries(visible.filter((f) => f.t !== "file").map((f) => [f.k, v[f.k] ?? null]));
      if (svc.key === "leave") details.days = daysBetween(v.from, v.to);
      const { data, error } = await sb.rpc("awtad_ess_submit", { p_service: svc.key, p_title: svc.titleOf ? svc.titleOf(v) : svc.title[0], p_details: details, p_amount: svc.amount?.(v, emp) ?? null, p_attachment: path, p_flow: svc.flow });
      if (error) throw new Error(error.message);
      notifyMail(data?.notify, "طلب جديد بانتظار اعتمادك — " + svc.title[0], `${emp.name}: ${svc.titleOf ? svc.titleOf(v) : svc.title[0]}`);
      await reload(); onDone();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="card ess-form">
      <div className="ess-form-h"><button className="btn sm ghost" onClick={back}>{t(["→ رجوع", "← Back"])}</button><h2><Ic n={svc.icon} /> {t(svc.title)}</h2></div>
      <Flow flow={svc.flow} emp={emp} t={t} />
      <div className="fgrid">{visible.map((f) => <label key={f.k + f.t} className={"fld" + (f.t === "textarea" || f.t === "check" ? " wide" : "")}>
        {f.t !== "check" && <span>{t(f.l)}{(typeof f.req === "function" ? f.req(v) : f.req) && " *"}</span>}
        {f.t === "select" ? <select value={v[f.k] || ""} onChange={(e) => setV(f.k, e.target.value)}><option value="">{t(["— اختر —", "— Select —"])}</option>{(typeof f.opts === "function" ? f.opts(emp) : f.opts || []).map(([val, ar, en]) => <option key={val} value={val}>{t([ar, en])}</option>)}</select>
          : f.t === "textarea" ? <textarea rows={3} value={v[f.k] || ""} onChange={(e) => setV(f.k, e.target.value)} />
          : f.t === "check" ? <span className="ess-check"><input type="checkbox" checked={!!v[f.k]} onChange={(e) => setV(f.k, e.target.checked)} /> {t(f.l)} *</span>
          : f.t === "file" ? <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          : <input type={f.t} min={f.min} value={v[f.k] || ""} placeholder={f.hint ? t(f.hint) : ""} dir={f.t === "text" ? "auto" : undefined} onChange={(e) => setV(f.k, e.target.value)} />}
      </label>)}</div>
      {svc.info?.(v, emp, d, t)}
      {msg && <div className="er">{msg}</div>}
      <div className="actions"><button className="btn" disabled={busy} onClick={submit}>{busy ? t(["جارٍ الإرسال...", "Sending..."]) : t(["إرسال الطلب", "Submit request"])}</button></div>
    </div>
  );
}

function Flow({ flow, emp, t, stage }: { flow: string[]; emp: Row; t: (x: L2) => string; stage?: string }) {
  const steps = flow.filter((s) => s !== "manager" || (emp.manager_id && emp.manager_id !== emp.id));
  const at = stage ? steps.indexOf(stage) : -1;
  return <div className="ess-flow">{[t(["الموظف", "Employee"]), ...steps.map((s) => t(STAGE[s]))].map((s, i) => <span key={i} className={stage === "rejected" ? "" : stage === "done" || i <= at ? "done" : i === at + 1 && stage ? "now" : ""}>{s}</span>)}</div>;
}

// ---------- الخطاب التعريفي وتعميد الغرفة التجارية ----------
function LetterService({ emp, t, lang, back, onDone }: { emp: Row; t: (x: L2) => string; lang: Lang; back: () => void; onDone: () => void }) {
  const { d, reload } = useData();
  const [kind, setKind] = useState("salary"), [to, setTo] = useState(""), [llang, setLlang] = useState<Lang>(lang), [issued, setIssued] = useState<Row | null>(null), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const [att, setAtt] = useState(false), [file, setFile] = useState<File | null>(null), [agree, setAgree] = useState(false);
  async function issue() {
    if (kind !== "payslip" && !to.trim()) return setMsg(t(["اكتب الجهة الموجّه إليها الخطاب", "Enter the addressee"]));
    setBusy(true); setMsg("");
    try {
      const { data, error } = await sb.rpc("awtad_ess_submit", { p_service: "letter", p_title: `${kind === "payslip" ? "مسير راتب" : "خطاب تعريف"} — ${to || ""}`, p_details: { kind, to, lang: llang }, p_amount: null, p_attachment: null, p_flow: ["hr"] });
      if (error) throw new Error(error.message);
      setIssued({ id: data?.id, kind, to, lang: llang, date: today() }); await reload();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  async function attest() {
    if (!file) return setMsg(t(["أرفق المستند المطلوب ختمه", "Attach the document to be stamped"])); if (!agree) return setMsg(t(["يجب الموافقة على خصم رسوم التعميد", "You must accept the attestation fee deduction"]));
    setBusy(true); setMsg("");
    try {
      const path = await uploadEss(emp.id, file);
      const { data, error } = await sb.rpc("awtad_ess_submit", { p_service: "attest", p_title: `تعميد الغرفة التجارية${issued?.to ? " — " + issued.to : ""}`, p_details: { letter_id: issued?.id || null, to: issued?.to || to, fee: ATTEST_FEE, fee_deduct: true }, p_amount: ATTEST_FEE, p_attachment: path, p_flow: ["hr"] });
      if (error) throw new Error(error.message);
      notifyMail(data?.notify, "طلب تعميد من الغرفة التجارية", `${emp.name}: ${issued?.to || to}`);
      await reload(); onDone();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(false); }
  }
  return (<>
    <div className="card ess-form noprint">
      <div className="ess-form-h"><button className="btn sm ghost" onClick={back}>{t(["→ رجوع", "← Back"])}</button><h2><Ic n="file" /> {t(LETTER_TITLE)}</h2></div>
      <div className="fgrid">
        <label className="fld"><span>{t(["نوع المستند", "Document"])}</span><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="salary">{t(["خطاب تعريف بالراتب", "Salary introduction letter"])}</option><option value="nosalary">{t(["خطاب تعريف بدون راتب", "Introduction letter (no salary)"])}</option><option value="payslip">{t(["مسير / كشف راتب", "Salary slip"])}</option></select></label>
        <label className="fld"><span>{t(["الجهة الموجّه إليها", "Addressed to"])}{kind !== "payslip" && " *"}</span><input value={to} dir="auto" onChange={(e) => setTo(e.target.value)} placeholder={t(["مثال: سفارة / بنك / من يهمه الأمر", "e.g. Embassy / Bank / To whom it may concern"])} /></label>
        {kind !== "payslip" && <label className="fld"><span>{t(["لغة الخطاب", "Letter language"])}</span><select value={llang} onChange={(e) => setLlang(e.target.value as Lang)}><option value="ar">العربية</option><option value="en">English</option></select></label>}
      </div>
      {msg && <div className="er">{msg}</div>}
      <div className="actions"><button className="btn" disabled={busy} onClick={issue}>{t(["إصدار فوري", "Issue now"])}</button></div>
    </div>
    {issued && (issued.kind === "payslip" ? <Payslip emp={emp} /> : <LetterDoc emp={emp} to={issued.to} kind={issued.kind} lang={issued.lang} no={issued.id} />)}
    {issued && <div className="card ess-form noprint">
      <h2><Ic n="award" /> {t(ATTEST_TITLE)}</h2>
      {!att ? <><p className="mut">{t(["يمكنك طلب ختم المستند من الغرفة التجارية، وتنهيه الموارد البشرية وتعيد رفعه في طلباتك.", "Request Chamber of Commerce stamping; HR completes it and uploads the result to your requests."])}</p><button className="btn" onClick={() => setAtt(true)}>{t(["طلب تعميد", "Request attestation"])}</button></>
        : <><div className="fgrid"><label className="fld"><span>{t(["المستند المراد ختمه *", "Document to be stamped *"])}</span><input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label></div>
          <label className="ess-check fee"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} /> {t([`أقرّ بأن رسوم التعميد ${ATTEST_FEE} ريالًا وأوافق على خصمها من راتبي`, `I acknowledge the attestation fee is SAR ${ATTEST_FEE} and agree to its deduction from my salary`])}</label>
          {msg && <div className="er">{msg}</div>}
          <div className="actions"><button className="btn" disabled={busy || !agree} onClick={attest}>{t(["موافقة وإرسال", "Agree & send"])}</button></div></>}
    </div>}
  </>);
}

export function LetterDoc({ emp, to, kind, lang, no }: { emp: Row; to: string; kind: string; lang: Lang; no?: any }) {
  const { company } = useData();
  const ar = lang !== "en", co = ar ? company?.name_ar || "المنشأة" : company?.name_en || company?.name_ar || "The Company";
  const sal = kind === "salary";
  return (
    <div className="card ess-letter" dir={ar ? "rtl" : "ltr"}>
      <div className="noprint" style={{ textAlign: "end" }}><button className="btn" onClick={() => window.print()}>{ar ? "طباعة / حفظ PDF" : "Print / Save PDF"}</button></div>
      <div className="ess-letter-h"><b>{co}</b><span>{ar ? "الرقم" : "Ref"}: HR-{no || "—"} · {ar ? "التاريخ" : "Date"}: {today()} {ar && `(${hijri()})`}</span></div>
      <h2>{ar ? "خطاب تعريف" : "Introduction Letter"}</h2>
      <p><b>{ar ? "إلى: " : "To: "}</b>{to}</p>
      {ar ? <p>تشهد {co} بأن السيد/ة <b>{emp.name}</b>، {emp.nationality || ""} الجنسية، ويحمل/تحمل هوية/إقامة رقم <b>{emp.national_id || "—"}</b>، يعمل/تعمل لدينا بوظيفة <b>{emp.job || "—"}</b> في قسم {emp.dept || "—"} منذ تاريخ {emp.join_date || "—"} وحتى تاريخه{sal ? <>، ويتقاضى/تتقاضى راتبًا شهريًا إجماليًا قدره <b>{n(gross(emp))} ريال سعودي</b> (الأساسي {n(+emp.basic || 0)}، السكن {n(+emp.house || 0)}، النقل {n(+emp.trans || 0)}، أخرى {n(+emp.other || 0)})</> : null}.</p>
        : <p>This is to certify that Mr./Ms. <b>{emp.name_en || emp.name}</b>, {emp.nationality || ""} national, ID/Iqama no. <b>{emp.national_id || "—"}</b>, has been employed with {co} as <b>{emp.job_en || emp.job || "—"}</b> since {emp.join_date || "—"} and is still in service{sal ? <>, with a total monthly salary of <b>SAR {n(gross(emp))}</b> (basic {n(+emp.basic || 0)}, housing {n(+emp.house || 0)}, transport {n(+emp.trans || 0)}, other {n(+emp.other || 0)})</> : null}.</p>}
      <p>{ar ? "وقد أُعطي هذا الخطاب بناءً على طلبه/طلبها دون أدنى مسؤولية على المنشأة." : "This letter is issued upon the employee's request without any liability on the company."}</p>
      <div className="ess-sign"><span>{ar ? "إدارة الموارد البشرية" : "Human Resources Department"}</span><span className="mut">{ar ? "الختم والتوقيع" : "Stamp & signature"}</span></div>
    </div>
  );
}

// ---------- طلباتي ----------
function Details({ r, t }: { r: Row; t: (x: L2) => string }) {
  const svc = SVC[r.service]; const lab = (k: string) => { const f = svc?.fields.find((x) => x.k === k); return f ? t(f.l) : k; };
  const entries = Object.entries(r.details || {}).filter(([, x]) => x !== null && x !== "" && x !== false);
  return <dl className="ess-dl">{entries.map(([k, x]) => <div key={k}><dt>{lab(k)}</dt><dd dir="auto">{x === true ? "✓" : String(x)}</dd></div>)}{r.amount != null && <div><dt>{t(["المبلغ", "Amount"])}</dt><dd>{n(+r.amount)} {t(["ر.س", "SAR"])}</dd></div>}</dl>;
}
function StatusBadge({ r, t }: { r: Row; t: (x: L2) => string }) {
  return <span className={"ess-badge " + r.status}>{r.status === "pending" ? `${t(STATUS.pending)} · ${t(STAGE[r.stage] || [r.stage, r.stage])}` : t(STATUS[r.status] || [r.status, r.status])}</span>;
}
function MyRequests({ emp, t }: { emp: Row; t: (x: L2) => string }) {
  const { d } = useData();
  const [open, setOpen] = useState<number | null>(null), [show, setShow] = useState<Row | null>(null);
  const mine = (d.ess_requests || []).filter((r) => r.employee_id === emp.id).sort((a, b) => b.id - a.id);
  if (show) return <><button className="btn sm ghost noprint" onClick={() => setShow(null)}>{t(["→ رجوع", "← Back"])}</button>{show.details?.kind === "payslip" ? <Payslip emp={emp} /> : <LetterDoc emp={emp} to={show.details?.to} kind={show.details?.kind} lang={show.details?.lang} no={show.id} />}</>;
  if (!mine.length) return <div className="card empty mut">{t(["لا توجد طلبات بعد. ابدأ من تبويب Self Services.", "No requests yet. Start from Self Services."])}</div>;
  return <div className="ess-list">{mine.map((r) => <div key={r.id} className="card ess-req">
    <div className="ess-req-h" onClick={() => setOpen(open === r.id ? null : r.id)}>
      <div><b>{svcTitle(r.service, t)}</b><div className="mut">#{r.id} · {(r.created_at || "").slice(0, 10)} · {r.title}</div></div>
      <StatusBadge r={r} t={t} />
    </div>
    {open === r.id && <div className="ess-req-b">
      <Flow flow={r.flow || []} emp={emp} t={t} stage={r.stage} />
      <Details r={r} t={t} />
      <History r={r} t={t} />
      <div className="actions">
        {r.attachment_path && <button className="btn sm ghost" onClick={() => openPath(r.attachment_path)}>{t(["المرفق", "Attachment"])}</button>}
        {r.result_path && <button className="btn sm" onClick={() => openPath(r.result_path)}>{t(["المستند المعتمد", "Approved document"])}</button>}
        {r.service === "letter" && <button className="btn sm" onClick={() => setShow(r)}>{t(["عرض وطباعة", "View & print"])}</button>}
      </div>
    </div>}
  </div>)}</div>;
}
function History({ r, t }: { r: Row; t: (x: L2) => string }) {
  const h = (r.history || []).filter((x) => x.action !== "submitted");
  if (!h.length) return null;
  return <ul className="ess-hist">{h.map((x, i) => <li key={i} className={x.action}><b>{x.action === "approved" ? t(["اعتمد", "Approved"]) : t(["رفض", "Rejected"])}</b> — {t(STAGE[x.stage] || [x.stage, x.stage])} · {(x.at || "").slice(0, 16).replace("T", " ")}{x.comment && <div className="mut">{x.comment}</div>}</li>)}</ul>;
}

// ---------- صندوق الاعتمادات (المدير / الموارد البشرية / الحسابات) ----------
function Inbox({ t }: { t: (x: L2) => string }) {
  const { d, reload, emp: empName } = useData();
  const { user } = useAuth();
  const role = user?.role || "", me = user?.employeeId;
  const [view, setView] = useState<"todo" | "all">("todo"), [comment, setComment] = useState<Record<number, string>>({}), [res, setRes] = useState<Record<number, File | null>>({}), [msg, setMsg] = useState(""), [busy, setBusy] = useState(0);
  const emps = d.employees || [], E = (id) => emps.find((x) => x.id === id) || {};
  const can = (r: Row) => r.status === "pending" && r.employee_id !== me && ((r.stage === "manager" && (role === "admin" || E(r.employee_id).manager_id === me)) || (r.stage === "hr" && ["admin", "hr"].includes(role)) || (r.stage === "accounts" && ["admin", "accountant"].includes(role)));
  const list = (d.ess_requests || []).filter((r) => (view === "todo" ? can(r) : true)).sort((a, b) => b.id - a.id);
  async function decide(r: Row, ok: boolean) {
    setBusy(r.id); setMsg("");
    try {
      const f = res[r.id]; const path = f ? await uploadEss(r.employee_id, f) : null;
      const { data, error } = await sb.rpc("awtad_ess_decide", { p_id: r.id, p_approve: ok, p_comment: comment[r.id] || null, p_result: path });
      if (error) throw new Error(error.message);
      notifyMail(data?.notify, "طلب بانتظار اعتمادك — " + (SVC[r.service]?.title[0] || r.service), `${empName(r.employee_id)}: ${r.title || ""}`);
      const ee = E(r.employee_id); if (ee.email && (data?.stage === "done" || data?.stage === "rejected")) sendMail(ee.email, data.stage === "done" ? "تم اعتماد طلبك" : "تم رفض طلبك", `<div dir="rtl">${r.title || ""}${comment[r.id] ? "<br>" + comment[r.id] : ""}</div>`).catch(() => {});
      await reload();
    } catch (e: any) { setMsg(e.message); } finally { setBusy(0); }
  }
  const todo = (d.ess_requests || []).filter(can).length;
  return (<>
    <div className="tabs ess-sub"><button className={view === "todo" ? "on" : ""} onClick={() => setView("todo")}>{t(["بانتظاري", "Awaiting me"])} ({todo})</button><button className={view === "all" ? "on" : ""} onClick={() => setView("all")}>{t(["كل الطلبات المتاحة لي", "All visible requests"])}</button></div>
    {msg && <div className="er">{msg}</div>}
    {!list.length && <div className="card empty mut">{t(["لا توجد طلبات", "No requests"])}</div>}
    <div className="ess-list">{list.map((r) => <div key={r.id} className="card ess-req">
      <div className="ess-req-h"><div><b>{empName(r.employee_id)}</b> — {svcTitle(r.service, t)}<div className="mut">#{r.id} · {(r.created_at || "").slice(0, 10)} · {r.title}</div></div><StatusBadge r={r} t={t} /></div>
      <div className="ess-req-b">
        <Flow flow={r.flow || []} emp={E(r.employee_id)} t={t} stage={r.stage} />
        <Details r={r} t={t} /><History r={r} t={t} />
        <div className="actions">{r.attachment_path && <button className="btn sm ghost" onClick={() => openPath(r.attachment_path)}>{t(["فتح المرفق", "Open attachment"])}</button>}{r.result_path && <button className="btn sm ghost" onClick={() => openPath(r.result_path)}>{t(["المستند النهائي", "Final document"])}</button>}</div>
        {can(r) && <div className="ess-decide">
          <input placeholder={t(["ملاحظة (اختياري)", "Comment (optional)"])} value={comment[r.id] || ""} onChange={(e) => setComment({ ...comment, [r.id]: e.target.value })} />
          {r.stage === "hr" && <label className="fld"><span>{t(["رفع المستند النهائي (مثل الخطاب المختوم)", "Upload final document (e.g. stamped letter)"])}</span><input type="file" accept="image/*,application/pdf" onChange={(e) => setRes({ ...res, [r.id]: e.target.files?.[0] || null })} /></label>}
          <div className="actions"><button className="btn" disabled={busy === r.id} onClick={() => decide(r, true)}>{t(["اعتماد", "Approve"])}</button><button className="btn dng" disabled={busy === r.id} onClick={() => decide(r, false)}>{t(["رفض", "Reject"])}</button></div>
        </div>}
      </div>
    </div>)}</div>
  </>);
}

// وحدة مستقلة في النظام الأساسي: صندوق الاعتمادات + أدوات الموارد البشرية
export function EssInbox() {
  const { err } = useData(); const { user } = useAuth(); const { t, lang, set } = useLang();
  return <div className="ess" dir={lang === "ar" ? "rtl" : "ltr"}>
    <div className="ess-lang top"><button className={lang === "ar" ? "on" : ""} onClick={() => set("ar")}>العربية</button><button className={lang === "en" ? "on" : ""} onClick={() => set("en")}>English</button></div>
    {err.ess_requests ? <SetupNotice t={t} /> : <Inbox t={t} />}
    {["admin", "hr"].includes(user?.role || "") && <PhotoTool t={t} />}
  </div>;
}
function PhotoTool({ t }: { t: (x: L2) => string }) {
  const { d, reload } = useData();
  const emps = (d.employees || []).filter((x) => x.active !== false);
  const [id, setId] = useState(""), [f, setF] = useState<File | null>(null), [msg, setMsg] = useState("");
  async function go() { const e = +(id || emps[0]?.id); if (!e || !f) return setMsg(t(["اختر الموظف والصورة", "Choose employee and photo"])); try { const p = await uploadEss(e, f, "photo"); const { error } = await sb.from(T("employees")).update({ photo_path: p }).eq("id", e); if (error) throw new Error(error.message); setMsg(t(["تم حفظ الصورة", "Photo saved"])); setF(null); await reload(); } catch (x: any) { setMsg(x.message); } }
  return <div className="card"><h2>{t(["الصورة الشخصية للموظف", "Employee photo"])}</h2><div className="row"><label className="fld"><span>{t(["الموظف", "Employee"])}</span><select value={id || String(emps[0]?.id ?? "")} onChange={(e) => setId(e.target.value)}>{emps.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="fld"><span>{t(["الصورة", "Photo"])}</span><input type="file" accept="image/*" onChange={(e) => setF(e.target.files?.[0] || null)} /></label><button className="btn" onClick={go}>{t(["حفظ", "Save"])}</button></div>{msg && <div className="mut">{msg}</div>}</div>;
}
