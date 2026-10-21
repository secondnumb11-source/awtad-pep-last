// شجرة القائمة الجانبية (تتطابق في بنيتها مع تسلسل المنصات المشابهة): مجموعات ← عناصر ← عناصر فرعية.
// k = مفتاح وحدة في registry. soon = غير متاح بعد.
export type NavNode = { t: string; ic?: string; k?: string; soon?: boolean; kids?: NavNode[] };
export type NavGroup = { t: string; items: NavNode[] };

export const NAV: NavGroup[] = [
  { t: "التقارير والتحليلات", items: [
    { t: "لوحة التحكم", ic: "grid", k: "dashboard" },
    { t: "التقارير", ic: "file", kids: [{ t: "مركز التقارير", k: "reports" }, { t: "منشئ التقارير", k: "report-builder" }, { t: "السجل الشهري", k: "attendance-report" }, { t: "ملخص اليوم", k: "rep-today" }, { t: "خريطة الحضور", k: "rep-map" }, { t: "تحليلات المواقع", k: "rep-locations" }, { t: "بحث متعدد", k: "rep-search" }, { t: "صلاحية الوثائق", k: "rep-docs" }, { t: "تقرير السيلفي", k: "rep-selfie" }] },
    { t: "بوابتي", ic: "users", k: "portal" },
  ] },
  { t: "الموارد البشرية الأساسية", items: [
    { t: "الموظفون", ic: "users", kids: [
      { t: "قائمة الموظفين", k: "employees" },
      { t: "الهيكل التنظيمي", kids: [{ t: "الأقسام", k: "org" }, { t: "المناصب", k: "positions" }, { t: "قائمة الفروع", k: "branches" }, { t: "الجنسيات", k: "nationalities" }, { t: "المجموعات", k: "groups" }, { t: "أعضاء المجموعات", k: "group-members" }, { t: "الكيانات", k: "entities" }] },
      { t: "إدارة الموظفين", kids: [{ t: "الانضمام والتهيئة", k: "onboarding" }, { t: "المستندات", k: "documents" }, { t: "العقود", k: "contracts" }, { t: "بطاقات الموظفين", k: "cards" }, { t: "الأصول والعهد", k: "assets" }, { t: "الإجراءات التأديبية", k: "disciplinary" }, { t: "إجراءات الخروج", k: "exit" }] },
      { t: "الربط الحكومي", k: "gov" },
    ] },
    { t: "إجراءات الموارد البشرية", ic: "flow", kids: [{ t: "إجراءات الحضور", k: "req-att" }, { t: "إجراءات الإجازات", k: "leaves" }, { t: "إجراءات العمل الإضافي", k: "req-ot" }, { t: "إجراءات الاستئذانات", k: "req-perm" }, { t: "إجراءات أخرى", k: "req-admin" }, { t: "الإجراءات الجماعية", k: "bulk" }] },
    { t: "طلبات الموظف", ic: "doc", kids: [
      { t: "طلبات الحضور", k: "req-att" }, { t: "طلبات الإجازات", kids: [{ t: "الإجازات", k: "leaves" }, { t: "الرصيد التعويضي", k: "req-leave" }, { t: "تاريخ العودة", k: "rep-return" }] },
      { t: "طلبات العمل الإضافي", k: "req-ot" }, { t: "طلبات الاستئذانات", k: "req-perm" },
      { t: "الطلبات الإدارية", kids: [{ t: "طلبات الأجهزة", soon: true }, { t: "تحديث المعلومات والتفويض والعقد", k: "req-admin" }, { t: "السلف", k: "loans" }, { t: "الخطابات والشهادات", k: "letters" }] },
      { t: "الطلبات والموافقات (الكل)", k: "requests" },
    ] },
  ] },
  { t: "المحاسبة", items: [
    { t: "شجرة الحسابات", ic: "flow", k: "acct-chart" },
    { t: "القيود", ic: "rc", kids: [{ t: "القيود اليومية", k: "journals" }, { t: "قيد جديد", k: "journal-new" }, { t: "ربط الأحداث بالحسابات", k: "acct-map" }] },
    { t: "التقارير المالية", ic: "chart", kids: [{ t: "دفتر الأستاذ", k: "ledger" }, { t: "ميزان المراجعة", k: "trial" }, { t: "قائمة الدخل", k: "income" }, { t: "الميزانية العمومية", k: "balance-sheet" }] },
    { t: "الرسوم والتجديدات", ic: "wal", k: "fees" },
    { t: "السنوات المالية والإقفال", ic: "cal", k: "fiscal" },
  ] },
  { t: "الشركة", items: [
    { t: "التنبيهات والتذكيرات", ic: "bell", k: "alerts" },
    { t: "التقارير الذكية", ic: "chart", k: "ai-reports" },
    { t: "ملف الشركة والترويسة", ic: "doc", k: "company-profile" },
    { t: "مستندات الشركة", ic: "file", k: "company-docs" },
    { t: "المواعيد والمهل", ic: "cal", k: "deadlines" },
    { t: "بوابات الموظفين", ic: "users", k: "portals" },
    { t: "دليل الموظف", ic: "help", k: "guide" },
  ] },
  { t: "عمليات القوى العاملة", items: [
    { t: "المواقع", ic: "pin", k: "locations" },
    { t: "إدارة المناوبات", ic: "clock", kids: [{ t: "المناوبات", k: "shifts" }, { t: "جدولة المناوبات", k: "shift-assign" }, { t: "المواسم (رمضان والصيف)", k: "seasons" }, { t: "العطلات الرسمية", k: "holidays" }] },
    { t: "الحضور والانصراف", ic: "clock", kids: [{ t: "سجل اليوم", k: "attendance" }, { t: "التحقق من المواقع", k: "verifications" }, { t: "التقارير الميدانية", k: "field-reports" }] },
    { t: "الإشعارات والتواصل", ic: "bell", kids: [{ t: "الإشعارات", k: "notifications" }, { t: "أخبار الشركة", k: "news" }] },
    { t: "أجهزة الحضور", ic: "db", soon: true },
    { t: "منصة مدراء الموظفين", ic: "users", kids: [{ t: "بوابات الموظفين", k: "portals" }, { t: "المستخدمون والصلاحيات", k: "users" }, { t: "التفويضات", k: "delegations" }, { t: "قواعد الموافقات", k: "approval-rules" }] },
  ] },
  { t: "الإدارات الأساسية", items: [
    { t: "إدارة الإجازات", ic: "cal", kids: [{ t: "الإجازات", k: "leaves" }, { t: "سياسات الإجازات", k: "leave-policies" }, { t: "رصيد الإجازات", k: "rep-balance" }, { t: "مستحقات الإجازة", k: "rep-entitle" }, { t: "ترحيل الإجازات", k: "rep-carry" }, { t: "استثناء من المستحقات", k: "rep-exempt" }, { t: "تداخل الإجازات", k: "rep-overlap" }, { t: "الإجازات الشهرية", k: "rep-monthleaves" }, { t: "إجازات الموظف", k: "rep-empleaves" }, { t: "ساعات العذر والإجازة", k: "rep-excuse" }] },
    { t: "الرواتب والمالية", ic: "wal", kids: [{ t: "مسير الرواتب", k: "payroll" }, { t: "كشوف الرواتب", k: "payslips" }, { t: "ملف حماية الأجور", k: "wps" }, { t: "القيود المحاسبية", k: "journal" }, { t: "مقارنة الرواتب", k: "bench" }, { t: "الرصيد التعويضي", k: "comp" }] },
    { t: "المصروفات والعهد", ic: "rc", kids: [{ t: "المصروفات", k: "expenses" }, { t: "سياسات المصروفات", k: "expense-policies" }, { t: "العهد النقدية", k: "petty" }, { t: "مصروفات العهد", k: "petty-spend" }, { t: "رحلات العمل", k: "trips" }] },
    { t: "إدارة المواهب", ic: "award", kids: [{ t: "الوظائف المعلنة", k: "jobs" }, { t: "التوظيف", k: "recruitment" }, { t: "الأهداف", k: "goals" }, { t: "دورات التقييم", k: "cycles" }, { t: "تقييم الأداء", k: "reviews" }, { t: "معايرة التقييمات", k: "calibration" }, { t: "الدورات", k: "courses" }, { t: "مسارات التعلم", k: "paths" }, { t: "دورات المسارات", k: "path-courses" }, { t: "التدريب", k: "training" }, { t: "شهادات الإتمام", k: "certificates" }, { t: "استبيانات التفاعل", k: "surveys" }, { t: "أجب عن استبيان", k: "survey-answer" }, { t: "نتائج الاستبيانات", k: "responses" }] },
    { t: "الأدوات", ic: "calc", kids: [{ t: "نهاية الخدمة", k: "eosb" }, { t: "حاسبة الراتب", k: "salary-calc" }, { t: "حاسبة النطاقات", k: "nitaqat" }] },
  ] },
  { t: "النظام", items: [
    { t: "الإعدادات والتكاملات", ic: "gear", k: "settings" }, { t: "قوائم الأنظمة", ic: "doc", kids: [{ t: "قواعد المصروفات", k: "expense-policies" }] },
    { t: "سجل التكاملات", ic: "doc", k: "integration-log" }, { t: "سجل التدقيق", ic: "file", k: "audit" }, { t: "فحص الاتصال", ic: "gear", k: "diagnostics" },
  ] },
];

// مبدّل «الإدارات» العلوي: أعمدة بأيقونات ووصف
export const SWITCH: { t: string; items: { t: string; d: string; ic: string; k: string }[] }[] = [
  { t: "المحاسبة", items: [{ t: "شجرة الحسابات", d: "الحسابات والقيود والأستاذ", ic: "flow", k: "acct-chart" }, { t: "ميزان المراجعة", d: "الميزانية وقائمة الدخل", ic: "calc", k: "trial" }, { t: "الرسوم والتجديدات", d: "ترحيل تلقائي للقيود", ic: "wal", k: "fees" }, { t: "التقارير الذكية", d: "اطلب أي تقرير بالكتابة", ic: "chart", k: "ai-reports" }] },
  { t: "إدارة القوى العاملة", items: [
    { t: "التقارير الذكية", d: "لوحة التحكم، ملخص اليوم، المواقع", ic: "chart", k: "dashboard" },
    { t: "الدوام", d: "الموظفون، المواقع والمناوبات", ic: "clock", k: "attendance" },
    { t: "المناوبات", d: "قائمة المناوبات، جدول المناوبات", ic: "cal", k: "shifts" },
    { t: "الإجازات", d: "الإجازات، الإجراءات اليدوية", ic: "cal", k: "leaves" } ] },
  { t: "التعويضات والمالية", items: [
    { t: "الرواتب", d: "إدارة الرواتب، طلبات الرواتب", ic: "wal", k: "payroll" },
    { t: "المصاريف", d: "بنود المصاريف، تشغيل حساب المصاريف", ic: "rc", k: "expenses" } ] },
  { t: "العمليات المتقدمة", items: [
    { t: "الأصول", d: "الأصول والعهد العينية", ic: "bag", k: "assets" },
    { t: "الانضباط", d: "الإجراءات التأديبية", ic: "file", k: "disciplinary" },
    { t: "التقييم", d: "الأهداف وتقييم 360", ic: "award", k: "reviews" } ] },
  { t: "إدارة المواهب", items: [
    { t: "التوظيف", d: "المرشحون ولوحة المراحل", ic: "bag", k: "recruitment" },
    { t: "الانضمام", d: "التهيئة والعقود", ic: "doc", k: "onboarding" },
    { t: "الاستبيانات", d: "استبيانات التفاعل ونتائجها", ic: "smile", k: "surveys" } ] },
];
