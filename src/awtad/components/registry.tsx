// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode } from "react";
import { Crud } from "./Crud";
import { CFG } from "./cfg";
import { Dashboard } from "./dash";
import { RepBalance, RepCarry, RepDocs, RepEmpLeaves, RepEntitle, RepExcuse, RepLocations, RepMap, RepMonthLeaves, RepOverlap, RepReturn, RepSearch, RepSelfie, RepToday, RepVisits, Reports } from "./reports";
import { Documents, MyPortal, Payslips } from "./portal";
import { SettingsPage } from "./settings";
import { AIReports } from "./ai";
import { AlertsCenter } from "./alerts";
import { ChartOfAccounts, BalanceSheet, Fees, FiscalYears, IncomeStatement, JournalForm, Journals, Ledger, Mappings, TrialBalance } from "./accounting";
import { CompanyDocs, CompanyProfile } from "./company";
import { GuidePage } from "./guide";
import { PortalAdmin } from "./portal-admin";
import { BulkActions, Calibration, Certificates, ReportBuilder, SurveyAnswer } from "./more";
import { Attendance, AttendanceReport, Diag, EmployeeCards, FieldReports, GovHub, UsersAdmin, Eosb, Journal, Nitaqat, Payroll, SalaryCalc, Wps } from "./views";

export type Mod = { key: string; title: string; icon: string; group?: string; roles: string[]; el: () => ReactNode };
const ALL = ["admin", "hr", "manager", "employee", "accountant"], MGR = ["admin", "hr", "manager"], HR = ["admin", "hr"], ACC = ["admin", "accountant"], CO = ["admin", "hr", "accountant"];
const crud = (k: string) => () => <Crud cfg={CFG[k]} />;

// الترتيب هنا هو ترتيب القائمة الجانبية؛ group يظهر كعنوان قسم. إضافة وحدة = سطر واحد.
export const MODULES: Mod[] = [
  { key: "portal", title: "بوابتي", icon: "users", group: "بوابة الموظف", roles: ALL, el: () => <MyPortal /> },
  { key: "dashboard", title: "لوحة التحكم", icon: "grid", group: "التقارير والتحليلات", roles: ALL, el: () => <Dashboard /> },
  { key: "reports", title: "التقارير", icon: "file", roles: MGR, el: () => <Reports /> },
  { key: "employees", title: "الموظفون", icon: "users", group: "الموارد البشرية الأساسية", roles: MGR, el: crud("emp") },
  { key: "documents", title: "مستندات الموظفين", icon: "file", roles: ALL, el: () => <Documents /> },
  { key: "entities", title: "الكيانات", icon: "flow", roles: HR, el: crud("entity") },
  { key: "contracts", title: "العقود", icon: "doc", roles: HR, el: crud("contract") },
  { key: "org", title: "الهيكل التنظيمي", icon: "flow", roles: MGR, el: crud("org") },
  { key: "onboarding", title: "الانضمام والتهيئة", icon: "doc", roles: MGR, el: crud("onb") },
  { key: "attendance", title: "الحضور والانصراف", icon: "clock", group: "عمليات القوى العاملة", roles: ALL, el: () => <Attendance /> },
  { key: "attendance-report", title: "تقرير الحضور الشهري", icon: "chart", roles: MGR, el: () => <AttendanceReport /> },
  { key: "seasons", title: "المواسم (رمضان والصيف)", icon: "cal", roles: HR, el: crud("season") },
  { key: "leaves", title: "الإجازات", icon: "cal", roles: ALL, el: crud("lv") },
  { key: "shifts", title: "المناوبات", icon: "clock", roles: MGR, el: crud("shift") },
  { key: "shift-assign", title: "جدولة المناوبات", icon: "cal", roles: MGR, el: crud("sassign") },
  { key: "locations", title: "مواقع العمل", icon: "pin", roles: MGR, el: crud("loc") },
  { key: "groups", title: "مجموعات الموظفين", icon: "users", roles: MGR, el: crud("grp") },
  { key: "group-members", title: "أعضاء المجموعات", icon: "users", roles: MGR, el: crud("gmem") },
  { key: "holidays", title: "العطلات الرسمية", icon: "cal", roles: ALL, el: crud("hol") },
  { key: "requests", title: "الطلبات والموافقات", icon: "doc", roles: ALL, el: crud("req") },
  { key: "loans", title: "السلف", icon: "wal", roles: ALL, el: crud("loan") },
  { key: "letters", title: "الخطابات والشهادات", icon: "file", roles: ALL, el: crud("letter") },
  { key: "field-reports", title: "التقارير الميدانية", icon: "pin", roles: ALL, el: () => <FieldReports /> },
  { key: "delegations", title: "التفويضات", icon: "flow", roles: MGR, el: crud("deleg") },
  { key: "comp", title: "الرصيد التعويضي", icon: "clock", roles: HR, el: crud("compl") },
  { key: "cards", title: "بطاقات الموظفين", icon: "users", roles: HR, el: () => <EmployeeCards /> },
  { key: "notifications", title: "الإشعارات", icon: "bell", group: "التواصل", roles: ALL, el: crud("notif") },
  { key: "news", title: "أخبار الشركة", icon: "doc", roles: ALL, el: crud("ann") },
  { key: "trips", title: "رحلات العمل", icon: "plane", roles: MGR, el: crud("trip") },
  { key: "payroll", title: "مسير الرواتب", icon: "wal", group: "الرواتب والمالية", roles: HR, el: () => <Payroll /> },
  { key: "payslips", title: "كشوف الرواتب", icon: "rc", roles: HR, el: () => <Payslips /> },
  { key: "wps", title: "ملف حماية الأجور", icon: "db", roles: HR, el: () => <Wps /> },
  { key: "journal", title: "القيود المحاسبية", icon: "rc", roles: HR, el: () => <Journal /> },
  { key: "expenses", title: "المصروفات", icon: "rc", roles: ALL, el: crud("exp") },
  { key: "petty", title: "العهد النقدية", icon: "wal", roles: MGR, el: crud("petty") },
  { key: "petty-spend", title: "مصروفات العهد", icon: "rc", roles: MGR, el: crud("ps") },
  { key: "bench", title: "مقارنة الرواتب", icon: "chart", roles: HR, el: crud("bench") },
  { key: "recruitment", title: "التوظيف", icon: "bag", group: "إدارة المواهب", roles: MGR, el: crud("rec") },
  { key: "goals", title: "الأهداف", icon: "target", roles: MGR, el: crud("goal") },
  { key: "reviews", title: "تقييم الأداء", icon: "award", roles: MGR, el: crud("rev") },
  { key: "courses", title: "الدورات", icon: "book", roles: MGR, el: crud("crs") },
  { key: "training", title: "التدريب", icon: "book", roles: MGR, el: crud("trn") },
  { key: "surveys", title: "استبيانات التفاعل", icon: "smile", roles: MGR, el: crud("svy") },
  { key: "responses", title: "نتائج الاستبيانات", icon: "smile", roles: ALL, el: crud("resp") },
  { key: "eosb", title: "نهاية الخدمة", icon: "calc", group: "الأدوات", roles: ALL, el: () => <Eosb /> },
  { key: "salary-calc", title: "حاسبة الراتب", icon: "calc", roles: ALL, el: () => <SalaryCalc /> },
  { key: "nitaqat", title: "حاسبة النطاقات", icon: "pin", roles: MGR, el: () => <Nitaqat /> },
  { key: "gov", title: "التكاملات الحكومية", icon: "db", group: "الامتثال والتكامل", roles: HR, el: () => <GovHub /> },
  { key: "integration-log", title: "سجل التكاملات", icon: "doc", roles: HR, el: crud("intl") },
  { key: "verifications", title: "التحقق من المواقع", icon: "pin", roles: MGR, el: crud("ver") },
  { key: "settings", title: "الإعدادات والتكاملات", icon: "gear", roles: ["admin"], el: () => <SettingsPage /> },
  { key: "users", title: "المستخدمون والصلاحيات", icon: "users", roles: ["admin"], el: () => <UsersAdmin /> },
  { key: "approval-rules", title: "قواعد الموافقات", icon: "flow", roles: HR, el: crud("rule") },
  { key: "lists", title: "قوائم المناصب والجنسيات", icon: "doc", roles: HR, el: crud("lst") },
  { key: "leave-policies", title: "سياسات الإجازات", icon: "cal", roles: HR, el: crud("lpol") },
  { key: "expense-policies", title: "سياسات المصروفات", icon: "rc", roles: HR, el: crud("xpol") },
  { key: "assets", title: "الأصول والعهد العينية", icon: "bag", roles: MGR, el: crud("asset") },
  { key: "disciplinary", title: "الإجراءات التأديبية", icon: "file", roles: HR, el: crud("disc") },
  { key: "exit", title: "إجراءات الخروج", icon: "out", roles: MGR, el: crud("exit") },
  { key: "req-att", title: "طلبات الحضور", icon: "doc", roles: ALL, el: crud("reqAtt") },
  { key: "req-leave", title: "الرصيد التعويضي (طلبات)", icon: "cal", roles: ALL, el: crud("reqLeave") },
  { key: "req-ot", title: "طلبات العمل الإضافي", icon: "clock", roles: ALL, el: crud("reqOt") },
  { key: "req-perm", title: "طلبات الاستئذان", icon: "doc", roles: ALL, el: crud("reqPerm") },
  { key: "req-admin", title: "الطلبات الإدارية", icon: "doc", roles: ALL, el: crud("reqAdmin") },
  { key: "positions", title: "المناصب", icon: "doc", roles: HR, el: crud("lstPos") },
  { key: "branches", title: "قائمة الفروع", icon: "flow", roles: HR, el: crud("lstBranch") },
  { key: "nationalities", title: "الجنسيات", icon: "users", roles: HR, el: crud("lstNat") },
  { key: "rep-today", title: "ملخص اليوم", icon: "chart", roles: MGR, el: () => <RepToday /> },
  { key: "rep-map", title: "خريطة الحضور", icon: "pin", roles: MGR, el: () => <RepMap /> },
  { key: "rep-locations", title: "تحليلات المواقع", icon: "pin", roles: MGR, el: () => <RepLocations /> },
  { key: "rep-search", title: "بحث متعدد", icon: "search", roles: MGR, el: () => <RepSearch /> },
  { key: "rep-visits", title: "الزيارات اليومية", icon: "pin", roles: MGR, el: () => <RepVisits /> },
  { key: "rep-docs", title: "صلاحية الوثائق", icon: "file", roles: MGR, el: () => <RepDocs /> },
  { key: "rep-empleaves", title: "إجازات الموظف", icon: "cal", roles: MGR, el: () => <RepEmpLeaves /> },
  { key: "rep-monthleaves", title: "الإجازات الشهرية", icon: "cal", roles: MGR, el: () => <RepMonthLeaves /> },
  { key: "rep-overlap", title: "تداخل الإجازات", icon: "cal", roles: MGR, el: () => <RepOverlap /> },
  { key: "rep-return", title: "تاريخ العودة", icon: "cal", roles: MGR, el: () => <RepReturn /> },
  { key: "rep-entitle", title: "مستحقات الإجازة", icon: "cal", roles: MGR, el: () => <RepEntitle /> },
  { key: "rep-balance", title: "رصيد الإجازات", icon: "cal", roles: MGR, el: () => <RepBalance /> },
  { key: "rep-carry", title: "ترحيل الإجازات", icon: "cal", roles: HR, el: () => <RepCarry /> },
  { key: "rep-exempt", title: "استثناء من مستحقات الإجازة", icon: "cal", roles: HR, el: crud("adj") },
  { key: "rep-excuse", title: "ساعات العذر والإجازة", icon: "clock", roles: MGR, el: () => <RepExcuse /> },
  { key: "rep-selfie", title: "تقرير السيلفي", icon: "users", roles: MGR, el: () => <RepSelfie /> },
  { key: "jobs", title: "الوظائف المعلنة", icon: "bag", roles: HR, el: crud("job") },
  { key: "cycles", title: "دورات التقييم", icon: "award", roles: HR, el: crud("cyc") },
  { key: "calibration", title: "معايرة التقييمات", icon: "chart", roles: MGR, el: () => <Calibration /> },
  { key: "survey-answer", title: "أجب عن استبيان", icon: "smile", roles: ALL, el: () => <SurveyAnswer /> },
  { key: "paths", title: "مسارات التعلم", icon: "book", roles: HR, el: crud("lpath") },
  { key: "path-courses", title: "دورات المسارات", icon: "book", roles: HR, el: crud("pcourse") },
  { key: "certificates", title: "شهادات الإتمام", icon: "award", roles: ALL, el: () => <Certificates /> },
  { key: "report-builder", title: "منشئ التقارير", icon: "chart", roles: HR, el: () => <ReportBuilder /> },
  { key: "bulk", title: "الإجراءات الجماعية", icon: "users", roles: HR, el: () => <BulkActions /> },
  { key: "alerts", title: "التنبيهات والتذكيرات", icon: "bell", roles: ALL, el: () => <AlertsCenter /> },
  { key: "ai-reports", title: "التقارير الذكية", icon: "chart", roles: ["admin", "hr", "manager", "accountant"], el: () => <AIReports /> },
  { key: "guide", title: "دليل الموظف", icon: "help", roles: ALL, el: () => <GuidePage /> },
  { key: "portals", title: "بوابات الموظفين", icon: "users", roles: HR, el: () => <PortalAdmin /> },
  { key: "company-profile", title: "ملف الشركة والترويسة", icon: "doc", roles: CO, el: () => <CompanyProfile /> },
  { key: "company-docs", title: "مستندات الشركة", icon: "file", roles: CO, el: () => <CompanyDocs /> },
  { key: "deadlines", title: "المواعيد والمهل", icon: "cal", roles: CO, el: crud("deadline") },
  { key: "acct-chart", title: "شجرة الحسابات", icon: "flow", roles: ACC, el: () => <ChartOfAccounts /> },
  { key: "journals", title: "القيود اليومية", icon: "rc", roles: ACC, el: () => <Journals /> },
  { key: "journal-new", title: "قيد يومية جديد", icon: "plus", roles: ACC, el: () => <JournalForm /> },
  { key: "ledger", title: "دفتر الأستاذ", icon: "book", roles: ACC, el: () => <Ledger /> },
  { key: "trial", title: "ميزان المراجعة", icon: "calc", roles: ACC, el: () => <TrialBalance /> },
  { key: "income", title: "قائمة الدخل", icon: "chart", roles: ACC, el: () => <IncomeStatement /> },
  { key: "balance-sheet", title: "الميزانية العمومية", icon: "chart", roles: ACC, el: () => <BalanceSheet /> },
  { key: "fees", title: "الرسوم والتجديدات", icon: "wal", roles: CO, el: () => <Fees /> },
  { key: "acct-map", title: "ربط الأحداث بالحسابات", icon: "flow", roles: ACC, el: () => <Mappings /> },
  { key: "fiscal", title: "السنوات المالية", icon: "cal", roles: ACC, el: () => <FiscalYears /> },
  { key: "audit", title: "سجل التدقيق", icon: "file", roles: ["admin"], el: crud("audit") },
  { key: "diagnostics", title: "فحص الاتصال", icon: "gear", group: "النظام", roles: HR, el: () => <Diag /> },
];

// الوصول للوحدة: الدور أولًا ثم تقييد الوحدات إن وُجد (لوحة التحكم وبوابتي متاحتان دائمًا)
export const canOpen = (m: Mod, role: string, access: string[] | null | undefined) =>
  m.roles.includes(role) && (!access || access.length === 0 || ["dashboard", "portal"].includes(m.key) || access.includes(m.key));
