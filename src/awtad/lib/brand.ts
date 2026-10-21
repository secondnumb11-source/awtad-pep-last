import boardroom from "@/assets/awtad/saudi_leadership_boardroom_landscape.jpg.asset.json";
import welcome from "@/assets/awtad/saudi_employee_welcome_landscape.jpg.asset.json";
import payroll from "@/assets/awtad/saudi_payroll_planning_landscape.jpg.asset.json";
import interview from "@/assets/awtad/saudi_talent_interview_landscape.jpg.asset.json";
import workforce from "@/assets/awtad/saudi_workforce_operations_landscape.jpg.asset.json";
import vault from "@/assets/awtad/employee_files_vault_3d_landscape.jpg.asset.json";
import balance from "@/assets/awtad/payroll_expense_balance_3d_landscape.jpg.asset.json";
import compliance from "@/assets/awtad/saudi_compliance_preparation_3d_landscape.jpg.asset.json";
import growth from "@/assets/awtad/talent_growth_path_3d_landscape.jpg.asset.json";
import data from "@/assets/awtad/organized_data_decisions_3d_landscape.jpg.asset.json";
import meeting from "@/assets/awtad/saudi_hr_employee_meeting_landscape.jpg.asset.json";
import strategy from "@/assets/awtad/saudi_executive_strategy_landscape.jpg.asset.json";

/** مفتاح العرض الخاص بالشركة: يخفي المحتوى التجاري مؤقتًا دون حذف أي ميزة. */
export const privateCompanyPresentation = true;

export const COMPANY = "أوتاد الفهد";
export const TICKER = "هذه النسخه تجريبية  تحت التعديل وليست معتمده من شركة اوتاد الفهد ولا تمثل الشركه";
export const IDENTITY = "نظام إدارة الموارد البشرية الخاص بشركة أوتاد الفهد";
export const NOT_COMMERCIAL = "غير مخصص للاستخدام التجاري";

/** صفحات تجارية تُخفى ما دام مفتاح العرض الخاص مفعّلًا */
export const COMMERCIAL_PAGES = ["pricing", "demo", "partners", "stories"];
export const isHiddenCommercial = (id: string) => privateCompanyPresentation && COMMERCIAL_PAGES.includes(id);

export const IMG = {
  home: boardroom.url, employees: welcome.url, payroll: payroll.url, talent: interview.url,
  attendance: workforce.url, files: vault.url, finance: balance.url, compliance: compliance.url,
  growth: growth.url, data: data.url, meeting: meeting.url, strategy: strategy.url,
};

const RULES: [RegExp, keyof typeof IMG][] = [
  [/payroll|salar|wage|loan|eos|gosi/, "payroll"],
  [/recruit|job|talent|interview|applic|candid|onboard/, "talent"],
  [/attend|shift|leave|perm|overtime|schedule|time/, "attendance"],
  [/doc|file|letter|asset/, "files"],
  [/expense|account|financ|trip|budget|invoice|ledger|custody/, "finance"],
  [/complian|gov|insur|iqama|contract|nitaq|mudad|qiwa/, "compliance"],
  [/train|perf|develop|goal|apprais|course|kpi/, "growth"],
  [/report|ai|analy|dash|alert|stat/, "data"],
  [/employ|staff|portal|org|dept|people|hr/, "employees"],
];
/** صورة القسم المناسبة لمسار الصفحة الداخلية */
export function imageForPath(path: string): string {
  const k = path.toLowerCase();
  for (const [re, img] of RULES) if (re.test(k)) return IMG[img];
  return IMG.home;
}
