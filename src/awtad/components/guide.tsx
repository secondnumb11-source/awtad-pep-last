// @ts-nocheck -- ported from original project (looser TS settings)
import { useEffect, useState } from "react";
import { useAuth } from "@/awtad/lib/auth";
import { useData } from "@/awtad/lib/data";
import { Ic } from "./Icons";

export const STEPS: { t: string; ic: string; d: string; b?: string[] }[] = [
  { t: "مرحبًا بك في بوابتك", ic: "users", d: "من هنا تتابع بياناتك وحضورك وإجازاتك وراتبك وتقدّم طلباتك بنفسك دون الرجوع إلى الورق." },
  { t: "صفحتك الرئيسية «بوابتي»", ic: "grid", d: "تعرض بياناتك الوظيفية والشخصية، ورصيد إجازتك، وآخر إجازاتك، ومستنداتك، وكشف راتبك القابل للطباعة." },
  { t: "تسجيل الحضور والانصراف", ic: "clock", d: "افتح «الحضور والانصراف» واضغط «حضور» عند الوصول و«انصراف» عند المغادرة.", b: ["اسمح للمتصفح بالوصول إلى موقعك عند الطلب: يُقبل التسجيل داخل نطاق موقع العمل المعتمد فقط", "قد تُطلب منك صورة سيلفي مع التسجيل لتأكيد الهوية", "هذا هو «البصمة» في النظام: تسجيل من جوالك بالموقع والصورة. أجهزة البصمة الفعلية غير مدعومة بعد", "إن نسيت التسجيل فقدّم «طلب تعديل دوام» من طلبات الحضور"] },
  { t: "الإجازات والطلبات", ic: "cal", d: "قدّم طلب إجازة أو استئذان أو عمل إضافي أو تعديل دوام من قوائم الطلبات، وتابع حالة كل طلب والمستوى الذي وصل إليه وتعليق المدير.", b: ["رصيد إجازتك ظاهر في بوابتي", "تصلك نتيجة الطلب إشعارًا (وبريدًا إن كان بريدك مسجّلًا)"] },
  { t: "كشف الراتب والمستندات", ic: "wal", d: "اطبع كشف راتبك أو احفظه PDF من «بوابتي». وتجد مستنداتك (العقد والإقامة وغيرها) وتواريخ انتهائها، ويمكنك توقيع عقدك إلكترونيًا حين يُرسل إليك." },
  { t: "الإشعارات والتنبيهات", ic: "bell", d: "الجرس في الأعلى يعرض كل ما يخصك: قرارات الطلبات، التذكيرات قبل بداية الدوام، تنبيهات انتهاء الوثائق، وأخبار الشركة." },
  { t: "تثبيت التطبيق على جوالك", ic: "plus", d: "يعمل أوتاد كتطبيق على الجوال دون متجر تطبيقات:", b: ["آيفون: افتح الرابط في متصفح سفاري ← اضغط زر المشاركة ← «إضافة إلى الشاشة الرئيسية» ← إضافة", "أندرويد: افتح الرابط في كروم ← اضغط ⋮ ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»", "بعد التثبيت افتح أيقونة «أوتاد» من شاشة جوالك واسمح بالموقع والكاميرا عند أول طلب"] },
  { t: "أمان حسابك", ic: "lock", d: "غيّر كلمة السر التي وصلتك من «بوابتي ← تغيير كلمة السر». لا تشارك كلمة السر مع أحد، ولا تسجّل الدخول من أجهزة لا تثق بها." },
  { t: "هل تحتاج مساعدة؟", ic: "help", d: "زر الدعم العائم في أسفل الشاشة يعرض وسائل التواصل مع الموارد البشرية. ويمكنك العودة لهذا الدليل في أي وقت من «دليل الموظف»." },
];

function Body({ i, setI, close }: { i: number; setI: (n: number) => void; close: () => void }) {
  const s = STEPS[i];
  return (<div className="guide"><div className="gstep"><span className="mic big"><Ic n={s.ic} s={30} /></span><h2>{s.t}</h2><p>{s.d}</p>{s.b && <ul>{s.b.map((x) => <li key={x}>{x}</li>)}</ul>}</div>
    <div className="gdots">{STEPS.map((_, k) => <i key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} />)}</div>
    <div className="actions">{i > 0 && <button className="btn soft" onClick={() => setI(i - 1)}>السابق</button>}{i < STEPS.length - 1 ? <button className="btn" onClick={() => setI(i + 1)}>التالي</button> : <button className="btn" onClick={close}>ابدأ الاستخدام ✓</button>}<button className="btn cancel" onClick={close}>تخطي</button></div></div>);
}
// يظهر تلقائيًا في أول دخول للموظف
export function GuideModal() {
  const { user } = useAuth(); const [show, setShow] = useState(false), [i, setI] = useState(0);
  useEffect(() => { if (user?.role === "employee") { try { if (!localStorage.getItem("awtad_guide_" + user.id)) setShow(true); } catch {} } }, [user]);
  if (!show) return null;
  const close = () => { try { localStorage.setItem("awtad_guide_" + user!.id, "1"); } catch {} setShow(false); };
  return <div className="modal"><div className="card"><Body i={i} setI={setI} close={close} /></div></div>;
}
export function GuidePage() { const [i, setI] = useState(0); useData(); return <div className="card"><h2>دليل الموظف</h2><Body i={i} setI={setI} close={() => setI(0)} /></div>; }
