// @ts-nocheck -- ported from original project (looser TS settings)
import { Cfg } from "./Crud";
import { upd, ins, del, sb } from "@/awtad/lib/supabase";
import { addDays, gross, n, today } from "@/awtad/lib/calc";
import { refLabel } from "./Crud";
import { Board, ContractTemplate, ExitTemplate, OnbTemplate, Renewals, SeedLeave } from "./views";
import { sendMail } from "@/awtad/lib/mail";
import { AssignPath, SeedHolidays } from "./more";
import { SeedDeadlines } from "./company";
import { T, getOrg } from "@/awtad/lib/supabase";

const ALL = ["admin", "hr", "manager", "employee"];
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / (a.length || 1);

export const CFG: Record<string, Cfg> = {
  emp: { table: "employees", addRoles: ["admin", "hr"], f: [
    { k: "name", l: "الاسم", t: "t", req: true }, { k: "nat", l: "الجنسية", t: "s", opts: ["S|سعودي", "N|غير سعودي"] },
    { k: "email", l: "البريد الإلكتروني", t: "t" }, { k: "national_id", l: "رقم الهوية / الإقامة", t: "t" }, { k: "nationality", l: "الجنسية", t: "c", list: "جنسية" }, { k: "gender", l: "الجنس", t: "s", opts: ["ذكر", "أنثى"] }, { k: "birth_date", l: "تاريخ الميلاد", t: "d" }, { k: "gosi_no", l: "رقم التأمينات", t: "t" }, { k: "qiwa_contract_no", l: "رقم عقد قوى", t: "t" },
    { k: "dept", l: "القسم", t: "t" }, { k: "job", l: "المسمى", t: "c", list: "منصب" },
    { k: "basic", l: "الأساسي", t: "n" }, { k: "house", l: "السكن", t: "n" }, { k: "trans", l: "النقل", t: "n" }, { k: "other", l: "أخرى", t: "n" },
    { k: "unit_id", l: "الوحدة", t: "r", ref: "org_units" }, { k: "join_date", l: "المباشرة", t: "d" }, { k: "iqama_expiry", l: "انتهاء الإقامة", t: "d" }, { k: "contract_end", l: "انتهاء العقد", t: "d" }, { k: "probation_end", l: "انتهاء فترة التجربة", t: "d" }, { k: "pay_group", l: "مجموعة الرواتب", t: "t" }, { k: "entity_id", l: "الكيان", t: "r", ref: "entities" },
    { k: "active", l: "نشط", t: "b" }, { k: "employment_type", l: "نوع الوظيفة", t: "s", opts: ["دوام كامل", "دوام جزئي", "عقد مؤقت"] }, { k: "marital_status", l: "الحالة الاجتماعية", t: "s", opts: ["أعزب", "متزوج", "غير ذلك"] }, { k: "education", l: "المؤهل", t: "t" },
    { k: "emergency_name", l: "جهة اتصال الطوارئ", t: "t" }, { k: "emergency_phone", l: "جوال الطوارئ", t: "t" }, { k: "address", l: "العنوان", t: "t" }, { k: "manager_id", l: "المدير المباشر", t: "r", ref: "employees" }, { k: "cost_center", l: "رقم مركز التكلفة", t: "t" },
    { k: "name_en", l: "الاسم بالإنجليزية", t: "t" }, { k: "job_en", l: "المسمى بالإنجليزية", t: "t" }, { k: "contract_type", l: "نوع العقد", t: "s", opts: ["محدد المدة", "غير محدد المدة", "مؤقت / موسمي", "عمل مرن"] }, { k: "contract_start", l: "بداية العقد", t: "d" },
    { k: "passport_no", l: "رقم الجواز", t: "t" }, { k: "insurance_company", l: "شركة التأمين الطبي", t: "t" }, { k: "insurance_no", l: "رقم التأمين الطبي", t: "t" }, { k: "insurance_class", l: "فئة التأمين", t: "t" },
    { k: "bank_name", l: "البنك", t: "t" }, { k: "annual_leave_days", l: "أيام الإجازة السنوية حسب العقد", t: "n" }, { k: "marriage_bonus", l: "مكافأة الزواج حسب العقد", t: "n" }, { k: "birth_bonus", l: "مكافأة المولود حسب العقد", t: "n" }, { k: "remote_punch", l: "السماح بالبصمة من أي موقع", t: "b" }],
    calc: [{ l: "الإجمالي", fn: (r) => n(gross(r)) }],
    act: [{ l: "تفعيل/تعطيل", roles: ["admin", "hr"], run: (r) => upd("employees", r.id, { active: !r.active }) },
      { l: "نقل لقسم", roles: ["admin", "hr"], run: async (r) => { const v = prompt("القسم الجديد", r.dept || ""); if (v !== null) await upd("employees", r.id, { dept: v }); } },
      { l: "ربط حساب", roles: ["admin"], run: async (r) => {
      const email = prompt("بريد المستخدم (يجب أن يكون قد أنشأ حسابًا من شاشة الدخول)"); if (!email) return;
      const role = prompt("الدور: admin أو hr أو manager أو employee", "employee"); if (!role) return;
      const { error } = await sb.rpc("awtad_assign_user", { p_email: email.trim(), p_employee_id: r.id, p_role: role.trim() });
      if (error) throw new Error(error.message); alert("تم ربط الحساب بالموظف");
    } }] },
  lv: { table: "leaves", st: true, addRoles: ALL, f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "type", l: "النوع", t: "s", opts: ["سنوية", "مرضية", "بدون راتب", "زواج", "وفاة", "مولود", "أمومة", "حج", "عدة", "امتحانات"] },
    { k: "from_date", l: "من", t: "d", req: true }, { k: "to_date", l: "إلى", t: "d", req: true }],
    pre: (o, _s, c) => {
      if (o.to_date < o.from_date) throw new Error("تاريخ النهاية قبل البداية");
      const days = Math.round((+new Date(o.to_date) - +new Date(o.from_date)) / 864e5) + 1;
      const pol = (c.d.leave_policies || []).find((p) => p.kind === o.type);
      if (pol) { const yr = String(o.from_date).slice(0, 4); const used = (c.d.leaves || []).filter((l) => l.employee_id == o.employee_id && l.type === o.type && l.status === "معتمدة" && String(l.from_date).startsWith(yr)).reduce((a, l) => a + l.days, 0);
        if (used + days > pol.days) throw new Error(`يتجاوز رصيد «${o.type}»: المسموح ${pol.days} يومًا، المستخدم ${used}، المطلوب ${days}`); }
      return { ...o, days };
    },
    calc: [{ l: "الأيام", fn: (r) => String(r.days) }],
    after: (c) => <div className="card"><h2>أرصدة الإجازة السنوية</h2>{(c.d.employees || []).map((x) => { const q = x.join_date && (Date.now() - +new Date(x.join_date)) / 31557600000 >= 5 ? 30 : 21, u = (c.d.leaves || []).filter((l) => l.employee_id == x.id && l.type === "سنوية" && l.status === "معتمدة").reduce((a, l) => a + l.days, 0); return <span className="chip" key={x.id}>{x.name}: {q - u} يوم</span>; })}</div>,
    act: [
      { l: "اعتماد", show: (r) => r.status === "بانتظار الموافقة", run: (r) => upd("leaves", r.id, { status: "معتمدة" }) },
      { l: "رفض", show: (r) => r.status === "بانتظار الموافقة", run: (r) => upd("leaves", r.id, { status: "مرفوضة" }) }] },
  exp: { table: "expenses", st: true, addRoles: ALL, f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "category", l: "الفئة", t: "s", opts: ["سفر", "ضيافة", "مستلزمات", "أخرى"] },
    { k: "amount", l: "المبلغ", t: "n", req: true }, { k: "expense_date", l: "تاريخ المصروف", t: "d" }, { k: "note", l: "ملاحظة", t: "t" }],
    pre: (o, _s, c) => {
      const flags: string[] = [], dep = (c.d.employees || []).find((x) => x.id == o.employee_id)?.dept, pols = (c.d.expense_policies || []).filter((p) => p.category === o.category), pol = pols.find((p) => p.dept && p.dept === dep) || pols.find((p) => !p.dept), ym = String(o.expense_date || "").slice(0, 7);
      if (pol?.max_amount && o.amount > pol.max_amount) flags.push(`يتجاوز حد الفئة (${pol.max_amount})`);
      if (pol?.monthly_budget) { const sum = (c.d.expenses || []).filter((e) => e.category === o.category && e.status !== "مرفوض" && String(e.expense_date || "").startsWith(ym) && (!pol.dept || (c.d.employees || []).find((x) => x.id === e.employee_id)?.dept === pol.dept)).reduce((a, e) => a + +e.amount, 0); if (sum + o.amount > pol.monthly_budget) flags.push(`يتجاوز الميزانية الشهرية (${pol.monthly_budget})`); }
      if ((c.d.expenses || []).some((e) => e.employee_id == o.employee_id && e.category === o.category && +e.amount === +o.amount && e.expense_date === o.expense_date && e.status !== "مرفوض")) flags.push("احتمال تكرار");
      return { ...o, flagged: flags.length ? flags.join("، ") : null };
    },
    calc: [{ l: "تنبيه السياسة", fn: (r) => (r.flagged ? <span className="wa">{r.flagged}</span> : "—") }, { l: "التعويض", fn: (r) => (r.paid_in ? "صُرف " + r.paid_in : r.status === "معتمد" ? "بانتظار المسير" : "—") }],
    act: [
      { l: "اعتماد", show: (r) => r.status.startsWith("بانتظار"), run: (r, c) => upd("expenses", r.id, { status: r.status === "بانتظار المدير" && (r.amount > c.set.limit || r.flagged) ? "بانتظار المالية" : "معتمد" }) },
      { l: "رفض", show: (r) => r.status.startsWith("بانتظار"), run: (r) => upd("expenses", r.id, { status: "مرفوض" }) }] },
  rec: { table: "candidates", f: [
    { k: "name", l: "الاسم", t: "t", req: true }, { k: "job", l: "الوظيفة", t: "t" }, { k: "email", l: "البريد", t: "t" }, { k: "phone", l: "الجوال", t: "t" },
    { k: "stage", l: "المرحلة", t: "s", opts: ["0|جديد", "1|فرز", "2|مقابلة", "3|عرض", "4|تعيين"] }],
    act: [
      { l: "المرحلة التالية", show: (r) => r.stage < 4, run: (r) => upd("candidates", r.id, { stage: r.stage + 1 }) },
      { l: "تحويل لموظف", show: (r) => r.stage === 4, run: async (r) => {
        const jd = prompt("تاريخ المباشرة (YYYY-MM-DD). إن كان في المستقبل يبقى الحساب في «ما قبل المباشرة» ويُفعَّل تلقائيًا في ذلك اليوم", addDays(today(), 14)); if (!jd) return;
        const pre = jd > today();
        const { data, error } = await sb.from(T("employees")).insert({ org_id: getOrg(), name: r.name, job: r.job, email: r.email, join_date: jd, active: !pre, preboarding: pre }).select("id").single();
        if (error) throw new Error(error.message);
        for (const [i, t] of ["توقيع العقد", "استلام المستندات", "إنشاء البريد والحسابات", "تسليم المعدات", "جولة تعريفية", "تدريب السلامة"].entries()) await ins("onboarding_tasks", { employee_id: data.id, title: t, due: addDays(jd, i * 2) });
        await del("candidates", r.id); alert(pre ? "أُنشئ الموظف في ما قبل المباشرة مع مهام التهيئة" : "أُنشئ الموظف مع مهام التهيئة");
      } }],
    calc: [{ l: "الفرز المبدئي", fn: (r) => (r.score != null ? <span className={r.score >= 60 ? "ok" : r.score >= 30 ? "wa" : "er"}>{r.score}%</span> : "—") }],
    after: () => <Board /> },
  org: { table: "org_units", tree: true, f: [
    { k: "name", l: "اسم الوحدة", t: "t", req: true }, { k: "parent_id", l: "الوحدة الأم", t: "r", ref: "org_units" }, { k: "head_id", l: "المدير", t: "r", ref: "employees" }] },
  onb: { table: "onboarding_tasks", f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "title", l: "المهمة", t: "t", req: true }, { k: "due", l: "الموعد", t: "d" }, { k: "done", l: "منجزة", t: "b" }],
    act: [{ l: "إنجاز", show: (r) => !r.done, run: (r) => upd("onboarding_tasks", r.id, { done: true }) }],
    after: () => <OnbTemplate /> },
  goal: { table: "goals", f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "title", l: "الهدف", t: "t", req: true }, { k: "kind", l: "النوع", t: "s", opts: ["SMART", "OKR", "MBO"] },
    { k: "cycle", l: "الدورة", t: "t" }, { k: "weight", l: "الوزن %", t: "n" }, { k: "progress", l: "التقدم %", t: "n" }],
    act: [{ l: "تحديث التقدم", run: async (r) => { const v = prompt("التقدم % (0-100)", String(r.progress ?? 0)); if (v !== null) await upd("goals", r.id, { progress: +v }); } }] },
  rev: { table: "reviews", f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "cycle_id", l: "الدورة", t: "r", ref: "review_cycles" }, { k: "reviewer_type", l: "نوع المقيّم", t: "s", opts: ["مدير", "زميل", "ذاتي", "مرؤوس"] },
    { k: "score", l: "الدرجة (1-5)", t: "n", req: true }, { k: "comment", l: "ملاحظات", t: "t" }],
    after: (c) => { const m: Record<string, number[]> = {}; (c.d.reviews || []).forEach((r) => (m[r.employee_id] = [...(m[r.employee_id] || []), +r.score || 0]));
      return <div className="card scroll"><h2>ملخص 360° لكل موظف</h2><table><thead><tr><th>الموظف</th><th>عدد التقييمات</th><th>المتوسط</th></tr></thead><tbody>
        {Object.entries(m).map(([id, a]) => <tr key={id}><td>{c.emp(id)}</td><td>{a.length}</td><td><b>{n(avg(a))}</b></td></tr>)}</tbody></table></div>; } },
  crs: { table: "courses", f: [{ k: "title", l: "الدورة", t: "t", req: true }, { k: "hours", l: "الساعات", t: "n" }, { k: "provider", l: "الجهة", t: "t" }] },
  trn: { table: "trainings", st: false, f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "course_id", l: "الدورة", t: "r", ref: "courses", req: true }, { k: "status", l: "الحالة", t: "s", opts: ["مسجّل", "قيد التنفيذ", "مكتمل"] }],
    act: [{ l: "إكمال", show: (r) => r.status !== "مكتمل", run: (r) => upd("trainings", r.id, { status: "مكتمل" }) }] },
  svy: { table: "surveys", f: [{ k: "title", l: "عنوان الاستبيان", t: "t", req: true }, { k: "question", l: "السؤال", t: "t", req: true }, { k: "status", l: "الحالة", t: "s", opts: ["مفتوح", "مغلق"] }] },
  resp: { table: "survey_responses", addRoles: ALL, f: [
    { k: "survey_id", l: "الاستبيان", t: "r", ref: "surveys", req: true }, { k: "score", l: "الدرجة (0-10)", t: "n", req: true }, { k: "comment", l: "تعليق", t: "t" }],
    after: (c) => { const m: Record<string, number[]> = {}; (c.d.survey_responses || []).forEach((r) => (m[r.survey_id] = [...(m[r.survey_id] || []), +r.score]));
      return <div className="card scroll"><h2>ملخص النتائج</h2><table><thead><tr><th>الاستبيان</th><th>الردود</th><th>المتوسط</th><th>eNPS</th></tr></thead><tbody>
        {Object.entries(m).map(([id, a]) => <tr key={id}><td>{refLabel("surveys", (c.d.surveys || []).find((x) => x.id == +id), c.emp)}</td><td>{a.length}</td><td>{n(avg(a))}</td>
          <td>{Math.round(((a.filter((x) => x >= 9).length - a.filter((x) => x <= 6).length) / a.length) * 100)}</td></tr>)}</tbody></table>
        <div className="mut">eNPS = نسبة المروّجين (9-10) ناقص نسبة المنتقدين (0-6).</div></div>; } },
  petty: { table: "petty_cash", f: [{ k: "employee_id", l: "صاحب العهدة", t: "e" }, { k: "amount", l: "المبلغ", t: "n", req: true }, { k: "note", l: "ملاحظة", t: "t" }],
    after: (c) => <div className="card scroll"><h2>أرصدة العهد</h2><table><thead><tr><th>العهدة</th><th>المصروف</th><th>المتبقي</th></tr></thead><tbody>
      {(c.d.petty_cash || []).map((r) => { const sp = (c.d.petty_spend || []).filter((x) => x.petty_id == r.id).reduce((a, x) => a + +x.amount, 0);
        return <tr key={r.id}><td>{refLabel("petty_cash", r, c.emp)}</td><td>{n(sp)}</td><td className={r.amount - sp < 0 ? "er" : "ok"}>{n(r.amount - sp)}</td></tr>; })}</tbody></table></div> },
  ps: { table: "petty_spend", f: [{ k: "petty_id", l: "العهدة", t: "r", ref: "petty_cash", req: true }, { k: "amount", l: "المبلغ", t: "n", req: true }, { k: "note", l: "البيان", t: "t" }] },
  trip: { table: "trips", st: true, f: [
    { k: "employee_id", l: "الموظف", t: "e" }, { k: "destination", l: "الوجهة", t: "t", req: true }, { k: "from_date", l: "من", t: "d" }, { k: "to_date", l: "إلى", t: "d" }, { k: "daily_allowance", l: "بدل يومي", t: "n" }],
    calc: [{ l: "إجمالي البدل", fn: (r) => (r.from_date && r.to_date ? n(((+new Date(r.to_date) - +new Date(r.from_date)) / 864e5 + 1) * r.daily_allowance) : "—") }],
    act: [
      { l: "اعتماد", show: (r) => r.status === "بانتظار الموافقة", run: (r) => upd("trips", r.id, { status: "معتمدة" }) },
      { l: "رفض", show: (r) => r.status === "بانتظار الموافقة", run: (r) => upd("trips", r.id, { status: "مرفوضة" }) }] },
  bench: { table: "salary_bands", f: [
    { k: "job", l: "الوظيفة", t: "t", req: true }, { k: "min_sal", l: "الحد الأدنى", t: "n" }, { k: "mid_sal", l: "المتوسط", t: "n" }, { k: "max_sal", l: "الحد الأعلى", t: "n" }],
    after: (c) => <div className="card scroll"><h2>مقارنة رواتب الموظفين بالنطاقات (حسب تطابق المسمى)</h2><table><thead><tr><th>الموظف</th><th>المسمى</th><th>الإجمالي</th><th>إلى المتوسط</th><th>الحالة</th></tr></thead><tbody>
      {(c.d.employees || []).map((x) => { const b = (c.d.salary_bands || []).find((r) => r.job === x.job), g = gross(x);
        const s = !b ? "لا يوجد نطاق" : g < b.min_sal ? "أقل من النطاق" : g > b.max_sal ? "أعلى من النطاق" : "ضمن النطاق";
        return <tr key={x.id}><td>{x.name}</td><td>{x.job}</td><td>{n(g)}</td><td>{b && +b.mid_sal ? Math.round((g / b.mid_sal) * 100) + "%" : "—"}</td><td className={!b ? "mut" : s === "ضمن النطاق" ? "ok" : s.startsWith("أقل") ? "er" : "wa"}>{s}</td></tr>; })}</tbody></table></div> },
};

const decide = (table: string, status: string) => async (r: any) => {
  const c = prompt("تعليق (اختياري)"); if (c === null) return;
  const { data } = await sb.auth.getUser();
  await upd(table, r.id, { status, comment: c || null, decided_by: data.user?.id });
};
const pend = (r: any) => String(r.status).startsWith("بانتظار");
const decideSimple = (table: string, status: string) => (r: any) => upd(table, r.id, { status });

CFG.shift = { table: "shifts", f: [
  { k: "name", l: "اسم المناوبة", t: "t", req: true }, { k: "kind", l: "النوع", t: "s", opts: ["ثابتة", "مفتوحة"] }, { k: "start_time", l: "بداية الدوام", t: "h" }, { k: "end_time", l: "نهاية الدوام", t: "h" },
  { k: "break_start", l: "بداية الاستراحة", t: "h" }, { k: "break_end", l: "نهاية الاستراحة", t: "h" },
  { k: "work_days", l: "أيام العمل", t: "s", opts: ["sun,mon,tue,wed,thu|الأحد إلى الخميس", "sat,sun,mon,tue,wed,thu|السبت إلى الخميس", "mon,tue,wed,thu,fri|الاثنين إلى الجمعة", "sun,mon,tue,wed,thu,fri|الأحد إلى الجمعة"] },
  { k: "flex_minutes", l: "دقائق المرونة", t: "n" }, { k: "required_hours", l: "الساعات المطلوبة (للمفتوحة)", t: "n" }, { k: "differential_pct", l: "بدل المناوبة %", t: "n" }, { k: "auto_checkout", l: "تسجيل الخروج التلقائي", t: "h" }] };
CFG.sassign = { table: "shift_assign", f: [
  { k: "employee_id", l: "الموظف", t: "e" }, { k: "shift_id", l: "المناوبة", t: "r", ref: "shifts", req: true }, { k: "from_date", l: "من تاريخ", t: "d", req: true },
  { k: "repeat_rule", l: "التكرار", t: "s", opts: ["none|بدون تكرار", "weekly|أسبوعي", "monthly|شهري"] }, { k: "until_date", l: "حتى تاريخ", t: "d" }] };
CFG.loc = { table: "locations", f: [
  { k: "name", l: "اسم الموقع", t: "t", req: true }, { k: "kind", l: "النوع", t: "s", opts: ["مكتب", "فرع", "موقع مشروع", "مستودع", "ميداني"] },
  { k: "lat", l: "خط العرض", t: "n" }, { k: "lng", l: "خط الطول", t: "n" }, { k: "radius_m", l: "نطاق التسجيل (متر)", t: "n" }, { k: "active", l: "نشط", t: "b" }],
  after: () => <div className="card mut">يُستخدم الموقع ونطاقه للتحقق الجغرافي عند التسجيل من التطبيق (تطبيق الجوال في المرحلة 6). الإحداثيات تُنسخ من خرائط Google بالضغط المطوّل على الموقع.</div> };
CFG.grp = { table: "groups", f: [{ k: "name", l: "اسم المجموعة", t: "t", req: true }, { k: "code", l: "الرمز", t: "t" }, { k: "supervisor_id", l: "المشرف", t: "r", ref: "employees" }] };
CFG.gmem = { table: "group_members", f: [{ k: "group_id", l: "المجموعة", t: "r", ref: "groups", req: true }, { k: "employee_id", l: "الموظف", t: "e" }] };
CFG.ann = { table: "announcements", f: [{ k: "title", l: "عنوان الخبر", t: "t", req: true }, { k: "body", l: "التفاصيل", t: "t" }, { k: "link", l: "رابط", t: "t" }, { k: "group_id", l: "المجموعة (فارغ = للجميع)", t: "r", ref: "groups" }] };
CFG.notif = { table: "notifications", act: [{ l: "إرسال بالبريد", roles: ["admin", "hr"], run: async (r, c) => { const list = r.employee_id ? (c.d.employees || []).filter((x) => x.id === r.employee_id) : (c.d.employees || []).filter((x) => x.active !== false); const to = list.map((x) => x.email).filter(Boolean); if (!to.length) throw new Error("لا توجد عناوين بريد للمستلمين. أضفها في ملف الموظف"); const m = await sendMail(to, r.title, `<p>${(r.body || r.title).replace(/</g, "&lt;")}</p>`); if (!m.ok) throw new Error(m.msg || "فشل الإرسال"); alert(`أُرسل البريد إلى ${to.length}`); } }], f: [{ k: "title", l: "العنوان", t: "t", req: true }, { k: "body", l: "المحتوى", t: "t" }, { k: "employee_id", l: "المستلم (فارغ = الجميع)", t: "r", ref: "employees" }, { k: "kind", l: "النوع", t: "s", opts: ["عام", "تحقق من الموقع", "تقييم", "استبيان", "تنبيه", "تهنئة"] }], addRoles: ["admin", "hr"] };
CFG.hol = { table: "holidays", f: [{ k: "name", l: "العطلة", t: "t", req: true }, { k: "day", l: "التاريخ", t: "d", req: true }, { k: "scope", l: "النطاق", t: "s", opts: ["الجميع", "السعوديون فقط", "فرع محدد"] }], after: () => <SeedHolidays /> };
CFG.req = { table: "requests", st: true, addRoles: ALL, f: [
  { k: "employee_id", l: "الموظف", t: "e" },
  { k: "kind", l: "نوع الطلب", t: "s", opts: ["تعديل دوام", "إضافة دوام", "حذف سجل دوام", "عمل إضافي", "طلب عذر", "رصيد تعويضي", "تغيير مناوبة", "تفويض مؤقت", "تحديث بيانات", "تجديد عقد", "تغيير جهاز", "استخدام رصيد تعويضي", "استئذان"] },
  { k: "req_date", l: "التاريخ", t: "d" }, { k: "end_date", l: "تاريخ النهاية (للتفويض)", t: "d" }, { k: "check_in", l: "وقت الدخول", t: "h" }, { k: "check_out", l: "وقت الخروج", t: "h" }, { k: "hours", l: "الساعات", t: "n" }, { k: "compensation", l: "تعويض الإضافي", t: "s", opts: ["أجر", "رصيد تعويضي"] },
  { k: "shift_id", l: "المناوبة الجديدة", t: "r", ref: "shifts" }, { k: "delegate_to", l: "المفوَّض إليه", t: "r", ref: "employees" }, { k: "reason", l: "المبرر", t: "t", req: true }],
  calc: [{ l: "المستويات", fn: (r) => `${(r.approvals || []).length}/${r.required_levels}` }, { l: "تعليق القرار", fn: (r) => r.comment || "—" }, { l: "مطبَّق", fn: (r) => (r.applied ? <span className="ok">✓</span> : "—") }],
  act: [
    { l: "اعتماد", show: pend, run: async (r, cx) => { const c = prompt("تعليق (اختياري)"); if (c === null) return; const { data, error } = await sb.rpc("awtad_decide_request", { p_id: r.id, p_approve: true, p_comment: c || null }); if (error) throw new Error(error.message); if (data) alert(data); const em = (cx.d.employees || []).find((x) => x.id === r.employee_id)?.email; if (em) sendMail(em, "تحديث على طلبك: " + r.kind, `<p>حالة طلبك (${r.kind}): ${data}${c ? " — " + c : ""}</p>`); } },
    { l: "رفض", show: pend, run: async (r, cx) => { const c = prompt("سبب الرفض"); if (c === null) return; const { data, error } = await sb.rpc("awtad_decide_request", { p_id: r.id, p_approve: false, p_comment: c || null }); if (error) throw new Error(error.message); if (data) alert(data); const em = (cx.d.employees || []).find((x) => x.id === r.employee_id)?.email; if (em) sendMail(em, "تحديث على طلبك: " + r.kind, `<p>رُفض طلبك (${r.kind})${c ? ": " + c : ""}</p>`); } },
    { l: "تطبيق", show: (r) => r.status === "معتمد" && !r.applied, run: async (r) => { const { data, error } = await sb.rpc("awtad_apply_request", { p_id: r.id }); if (error) throw new Error(error.message); if (data) alert(data); } }],
  after: () => <Renewals /> };
CFG.loan = { table: "loans", st: true, addRoles: ALL, f: [
  { k: "employee_id", l: "الموظف", t: "e" }, { k: "amount", l: "المبلغ", t: "n", req: true }, { k: "installment", l: "القسط الشهري", t: "n" }, { k: "start_month", l: "بداية الخصم (YYYY-MM)", t: "t" }, { k: "note", l: "ملاحظة", t: "t" }],
  act: [{ l: "اعتماد", roles: ["admin", "hr"], show: pend, run: decideSimple("loans", "معتمد") }, { l: "رفض", roles: ["admin", "hr"], show: pend, run: decideSimple("loans", "مرفوض") }],
  after: () => <div className="card mut">السلف المعتمدة تُسجَّل هنا. خصم الأقساط تلقائيًا من المسير ضمن خطة المرحلة 4.</div> };
CFG.letter = { table: "letters", st: true, addRoles: ALL, f: [
  { k: "employee_id", l: "الموظف", t: "e" }, { k: "kind", l: "نوع الخطاب", t: "s", opts: ["شهادة تعريف بالراتب", "شهادة خبرة", "خطاب تعريف", "خطاب لجهة حكومية", "خطاب لسفارة"] }, { k: "addressed_to", l: "الجهة الموجّه إليها", t: "t" }],
  act: [{ l: "اعتماد", roles: ["admin", "hr"], show: pend, run: decideSimple("letters", "معتمد") }, { l: "رفض", roles: ["admin", "hr"], show: pend, run: decideSimple("letters", "مرفوض") }] };
CFG.ver = { table: "verifications", readonly: false, addRoles: ["admin", "hr"], f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "title", l: "سبب التحقق", t: "t", req: true }],
  calc: [{ l: "الحالة", fn: (r) => r.status }, { l: "الموقع", fn: (r) => (r.lat != null ? <a className="ok" href={`https://www.google.com/maps?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer">فتح على الخريطة</a> : "—") }, { l: "تعليق الموظف", fn: (r) => r.comment || "—" }] };
CFG.audit = { table: "audit", readonly: true, desc: true, f: [{ k: "action", l: "العملية", t: "t" }, { k: "table_name", l: "الجدول", t: "t" }, { k: "record_id", l: "رقم السجل", t: "t" }, { k: "at", l: "الوقت", t: "t" }] };
CFG.rule = { table: "approval_rules", addRoles: ["admin", "hr"], f: [
  { k: "kind", l: "نوع الطلب", t: "s", opts: ["تعديل دوام", "إضافة دوام", "حذف سجل دوام", "عمل إضافي", "طلب عذر", "رصيد تعويضي", "استخدام رصيد تعويضي", "تغيير مناوبة", "تفويض مؤقت", "تحديث بيانات", "تجديد عقد", "تغيير جهاز"] },
  { k: "levels", l: "المستويات", t: "s", opts: ["1|مستوى واحد (مدير)", "2|مستويان (مدير ثم موارد بشرية)"] }],
  after: () => <div className="card mut">الافتراضي مستوى واحد. المستوى الثاني يتطلب الموارد البشرية أو مدير النظام، ولا يعتمد أحدٌ طلبه بنفسه. إن وُجدت قاعدة للنوع نفسه فاحذفها قبل إضافة قاعدة جديدة.</div> };
CFG.lst = { table: "lists", addRoles: ["admin", "hr"], f: [{ k: "kind", l: "نوع القائمة", t: "s", opts: ["منصب", "جنسية", "فرع"] }, { k: "name", l: "القيمة", t: "t", req: true }],
  after: () => <div className="card mut">تظهر هذه القيم كاقتراحات في حقلي «المسمى» و«الجنسية» في ملف الموظف.</div> };
CFG.deleg = { table: "delegations", readonly: true, f: [{ k: "from_emp", l: "المفوِّض", t: "e" }, { k: "to_emp", l: "المفوَّض إليه", t: "e" }, { k: "from_date", l: "من", t: "d" }, { k: "to_date", l: "إلى", t: "d" }],
  after: () => <div className="card mut">تُنشأ التفويضات تلقائيًا عند اعتماد طلب «تفويض مؤقت». خلال الفترة يعمل المفوَّض إليه بصلاحية «مدير» فعلًا.</div> };
CFG.compl = { table: "comp_ledger", readonly: true, desc: true, f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "hours", l: "الساعات (+ إضافة / − استخدام)", t: "n" }, { k: "reason", l: "السبب", t: "t" }],
  after: (c) => { const m: Record<string, number> = {}; (c.d.comp_ledger || []).forEach((r) => (m[r.employee_id] = (m[r.employee_id] || 0) + +r.hours)); return <div className="card"><h2>الأرصدة</h2>{Object.entries(m).map(([i, v]) => <span className="chip" key={i}>{c.emp(i)}: {n(v)} ساعة</span>)}</div>; } };
CFG.xpol = { table: "expense_policies", addRoles: ["admin", "hr"], f: [{ k: "category", l: "الفئة", t: "s", opts: ["سفر", "ضيافة", "مستلزمات", "أخرى"] }, { k: "dept", l: "القسم (فارغ = كل الأقسام)", t: "t" }, { k: "max_amount", l: "الحد الأقصى للمصروف الواحد", t: "n" }, { k: "monthly_budget", l: "الميزانية الشهرية للفئة", t: "n" }, { k: "note", l: "ملاحظة", t: "t" }],
  after: () => <div className="card mut">أي مصروف يتجاوز الحد أو الميزانية أو يبدو مكررًا يُوسَم تلقائيًا ويمر باعتماد المالية. التعويض المعتمد يُضاف إلى مسير الموظف.</div> };
CFG.lpol = { table: "leave_policies", addRoles: ["admin", "hr"], f: [{ k: "kind", l: "نوع الإجازة", t: "s", opts: ["سنوية", "مرضية", "بدون راتب", "زواج", "وفاة", "مولود", "أمومة", "حج", "عدة", "امتحانات"] }, { k: "days", l: "الأيام في السنة", t: "n", req: true }, { k: "paid_pct", l: "نسبة الأجر %", t: "n" }, { k: "note", l: "ملاحظة", t: "t" }],
  after: () => <SeedLeave /> };
CFG.season = { table: "seasons", addRoles: ["admin", "hr"], f: [{ k: "name", l: "الموسم (رمضان، صيف...)", t: "t", req: true }, { k: "from_date", l: "من", t: "d", req: true }, { k: "to_date", l: "إلى", t: "d", req: true }, { k: "daily_hours", l: "ساعات العمل اليومية", t: "n" }, { k: "shift_start", l: "بداية الدوام", t: "h" }, { k: "shift_end", l: "نهاية الدوام", t: "h" }],
  after: () => <div className="card mut">خلال فترة الموسم تُحتسب بداية الدوام الموسمية في كشف الحضور والتأخير بدل الافتراضية. المعتاد تخفيض ساعات العمل في رمضان للمسلمين؛ راجع الحدود النظامية.</div> };
CFG.entity = { table: "entities", addRoles: ["admin", "hr"], f: [{ k: "name", l: "اسم الكيان", t: "t", req: true }, { k: "cr_number", l: "السجل التجاري", t: "t" }, { k: "notes", l: "ملاحظات", t: "t" }],
  after: () => <div className="card mut">اربط كل موظف بكيانه من ملف الموظف، ثم صفِّ المسير بالكيان. الإعدادات (التأمينات والمناوبات) ما زالت موحدة لكل الكيانات.</div> };
CFG.contract = { table: "contracts", st: true, addRoles: ["admin", "hr"], f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "title", l: "عنوان العقد", t: "t", req: true }, { k: "body", l: "نص العقد", t: "t" }],
  calc: [{ l: "وقّعه", fn: (r) => (r.signed_name ? `${r.signed_name} — ${(r.signed_at || "").slice(0, 10)}` : "—") }],
  act: [{ l: "إرسال للموظف", roles: ["admin", "hr"], show: (r) => r.status === "مسودة", run: async (r, c) => { await upd("contracts", r.id, { status: "أُرسل" }); const em = (c.d.employees || []).find((x) => x.id === r.employee_id)?.email; if (em) { const m = await sendMail(em, "عقد عمل بانتظار توقيعك", `<p>أُرسل إليك «${r.title}» للتوقيع. سجّل الدخول إلى أوتاد ثم افتح «بوابتي».</p>`); if (!m.ok) alert("أُرسل العقد لكن تعذّر إرسال البريد: " + m.msg); } } }],
  after: () => <ContractTemplate /> };
CFG.asset = { table: "assets", f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "name", l: "الأصل", t: "t", req: true }, { k: "serial", l: "الرقم التسلسلي", t: "t" }, { k: "issued_on", l: "تاريخ التسليم", t: "d" }, { k: "returned_on", l: "تاريخ الإرجاع", t: "d" }, { k: "status", l: "الحالة", t: "t" }],
  act: [{ l: "تسجيل الإرجاع", show: (r) => !r.returned_on, run: (r) => upd("assets", r.id, { returned_on: today(), status: "أُعيد" }) }] };
CFG.disc = { table: "disciplinary", f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "kind", l: "نوع الإجراء", t: "s", opts: ["إنذار شفهي", "إنذار كتابي أول", "إنذار كتابي ثانٍ", "خصم", "إيقاف", "إنهاء خدمة"] }, { k: "on_date", l: "التاريخ", t: "d" }, { k: "details", l: "الوقائع", t: "t", req: true }, { k: "status", l: "الحالة", t: "s", opts: ["مسجّل", "معتمد", "ملغى"] }],
  after: () => <div className="card mut">سجل داخلي للإجراءات. يجب أن تتوافق الإجراءات والعقوبات مع لائحة تنظيم العمل المعتمدة ونظام العمل.</div> };
CFG.exit = { table: "exit_tasks", f: [{ k: "employee_id", l: "الموظف", t: "e" }, { k: "title", l: "المهمة", t: "t", req: true }, { k: "done", l: "منجزة", t: "b" }],
  act: [{ l: "إنجاز", show: (r) => !r.done, run: (r) => upd("exit_tasks", r.id, { done: true }) }], after: () => <ExitTemplate /> };
const kindCfg = (kinds: string[], withAfter = false): Cfg => ({ ...CFG.req, f: CFG.req.f.map((f) => (f.k === "kind" ? { ...f, opts: kinds } : f)), where: (r) => kinds.includes(r.kind), after: withAfter ? CFG.req.after : undefined });
CFG.reqAtt = kindCfg(["تعديل دوام", "إضافة دوام", "حذف سجل دوام", "تغيير مناوبة", "طلب عذر"]);
CFG.reqLeave = kindCfg(["رصيد تعويضي", "استخدام رصيد تعويضي"]);
CFG.reqOt = kindCfg(["عمل إضافي"]);
CFG.reqPerm = kindCfg(["استئذان"]);
CFG.reqAdmin = kindCfg(["تغيير جهاز", "تحديث بيانات", "تفويض مؤقت", "تجديد عقد"], true);
const listCfg = (kind: string): Cfg => ({ ...CFG.lst, f: CFG.lst.f, where: (r) => r.kind === kind, fixed: { kind }, after: undefined });
CFG.lstPos = listCfg("منصب"); CFG.lstBranch = listCfg("فرع"); CFG.lstNat = listCfg("جنسية");
CFG.adj = { table: "leave_adjustments", addRoles: ["admin", "hr"], where: (r) => r.kind === "استثناء", fixed: { kind: "استثناء" }, f: [
  { k: "employee_id", l: "الموظف", t: "e" }, { k: "year", l: "السنة", t: "n", req: true }, { k: "days", l: "الأيام المستثناة", t: "n", req: true }, { k: "note", l: "السبب", t: "t" }],
  after: () => <div className="card mut">الأيام المستثناة تُخصم من مستحقات الإجازة المتراكمة (مثل فترات الإجازة بدون راتب). تظهر في تقارير المستحقات والرصيد.</div> };
CFG.job = { table: "jobs", addRoles: ["admin", "hr"], f: [{ k: "title", l: "المسمى الوظيفي", t: "t", req: true }, { k: "dept", l: "القسم", t: "t" }, { k: "description", l: "الوصف", t: "t" }, { k: "requirements", l: "المتطلبات (كلمات مفتاحية بفواصل)", t: "t" }, { k: "status", l: "الحالة", t: "s", opts: ["مفتوحة", "مغلقة"] }],
  after: () => <div className="card mut">الوظائف المفتوحة تظهر في الصفحة العامة التي تفعّلها من «الإعدادات والتكاملات ← صفحة الوظائف العامة». ويُحسب فرز مبدئي لكل متقدم بنسبة تطابق نصه مع كلمات المتطلبات.</div> };
CFG.cyc = { table: "review_cycles", addRoles: ["admin", "hr"], f: [{ k: "name", l: "اسم الدورة", t: "t", req: true }, { k: "kind", l: "النوع", t: "s", opts: ["سنوية", "نصف سنوية", "تجربة", "مخصصة"] }, { k: "from_date", l: "من", t: "d" }, { k: "to_date", l: "إلى", t: "d" }, { k: "status", l: "الحالة", t: "s", opts: ["مفتوحة", "مغلقة"] }, { k: "criteria", l: "معايير التقييم (بفواصل)", t: "t" }] };
CFG.lpath = { table: "learning_paths", addRoles: ["admin", "hr"], f: [{ k: "name", l: "اسم المسار", t: "t", req: true }, { k: "description", l: "الوصف", t: "t" }], after: () => <AssignPath /> };
CFG.pcourse = { table: "path_courses", addRoles: ["admin", "hr"], f: [{ k: "path_id", l: "المسار", t: "r", ref: "learning_paths", req: true }, { k: "course_id", l: "الدورة", t: "r", ref: "courses", req: true }, { k: "position", l: "الترتيب", t: "n" }] };
CFG.deadline = { table: "deadlines", addRoles: ["admin", "hr", "accountant"], f: [
  { k: "title", l: "الموعد أو المهلة", t: "t", req: true }, { k: "category", l: "التصنيف", t: "t" }, { k: "recurrence", l: "التكرار", t: "s", opts: ["شهري", "سنوي", "مرة واحدة"] },
  { k: "day_of_month", l: "اليوم من الشهر", t: "n" }, { k: "month_of_year", l: "الشهر (للسنوي)", t: "n" }, { k: "due_date", l: "التاريخ (لمرة واحدة)", t: "d" }, { k: "notify_days", l: "التنبيه قبل (يوم)", t: "n" }, { k: "notes", l: "ملاحظات", t: "t" }],
  calc: [{ l: "آخر إنجاز", fn: (r) => r.done_period || "—" }],
  act: [{ l: "تم الإنجاز", roles: ["admin", "hr", "accountant"], run: (r) => upd("deadlines", r.id, { done_period: r.recurrence === "شهري" ? today().slice(0, 7) : r.recurrence === "سنوي" ? today().slice(0, 4) : "done" }) },
        { l: "إعادة فتح", roles: ["admin", "hr", "accountant"], show: (r) => !!r.done_period, run: (r) => upd("deadlines", r.id, { done_period: null }) }],
  after: () => <SeedDeadlines /> };
CFG.intl = { table: "integration_logs", addRoles: ["admin", "hr"], f: [{ k: "platform", l: "المنصة", t: "s", opts: ["قوى", "مدد", "التأمينات الاجتماعية", "مقيم", "أبشر أعمال", "ساند", "بنك"] }, { k: "action", l: "العملية", t: "t", req: true }, { k: "result", l: "النتيجة", t: "s", opts: ["نجحت", "فشلت", "قيد المعالجة"] }] };

export { addDays };

const Node = ({ id, units, emp }: { id: any; units: any[]; emp: (i: any) => string }) => {
  const kids = units.filter((u) => (u.parent_id || null) == id);
  if (!kids.length) return null;
  return <ul className="orgtree">{kids.map((u) => <li key={u.id}><div className="orgnode"><b>{u.name}</b>{u.head_id && <span>{emp(u.head_id)}</span>}</div><Node id={u.id} units={units} emp={emp} /></li>)}</ul>;
};
CFG.org.after = (c) => <div className="card scroll"><h2>المخطط التنظيمي</h2><div className="noprint"><button className="btn sm" onClick={() => window.print()}>طباعة المخطط</button></div>{(c.d.org_units || []).length ? <Node id={null} units={c.d.org_units || []} emp={c.emp} /> : <div className="mut">أضف وحدات لتظهر هنا</div>}</div>;
