import { Link } from "@/awtad/nav";
import { Bullets, Cards, Hero } from "@/awtad/components/site/parts";
import { Counter, Reveal } from "@/awtad/components/site/Fx";
import { Tabs } from "@/awtad/components/site/Tabs";
import { MiniArt, hueOf } from "@/awtad/components/site/Art";
import { HeroRings } from "@/awtad/components/site/HeroRings";
import { logoWhite } from "@/awtad/components/site/Brand";
import { FAQ, KN, PR, SO } from "@/awtad/lib/site-data";
import { IMG, privateCompanyPresentation as priv } from "@/awtad/lib/brand";

const WHY: [string, string][] = [
  ["منصة واحدة", "موارد بشرية ورواتب وحضور ومصروفات ومواهب في مكان واحد بدل أنظمة متفرقة."],
  ["مصمَّمة للسعودية", "حسابات التأمينات والإضافي ونهاية الخدمة والنطاقات وفق نظام العمل السعودي."],
  ["امتثال بلا مفاجآت", "تنبيهات الإقامات والعقود وملفات جاهزة لمنصات قوى ومدد والتأمينات."],
  ["للموظف بوابته", "يرى رصيد إجازاته وكشف راتبه ومستنداته ويقدّم طلباته بنفسه."],
  ["أمان مبني من الأساس", "عزل البيانات وأدوار دقيقة وسجل تدقيق لكل تغيير."],
  ["صدق في التقدّم", "نذكر ما هو جاهز وما هو قيد التطوير في كل صفحة."],
];
const JOURNEY = ["اطلب عرضًا تجريبيًا", "هيّئ منشأتك وأضف موظفيك", "فعّل الحضور والرواتب والامتثال", "وسّع بالمواهب والمصروفات متى شئت"];
const COMPLIANCE = ["حساب التأمينات الاجتماعية حسب الجنسية وسقف الأجر", "حاسبة نهاية الخدمة بالمادتين 84 و85", "تنبيهات انتهاء الإقامات والعقود", "تجهيز ملفات الأجور والاشتراكات والعقود للرفع", "التقويم الهجري وسياسات الإجازات"];
const GALLERY: [string, string, string][] = [
  [IMG.employees, "الموظفون", "استقبال وملفات رقمية متكاملة"], [IMG.payroll, "الرواتب", "تخطيط ومسير دقيق"],
  [IMG.talent, "المواهب", "مقابلات وتوظيف منظم"], [IMG.attendance, "الحضور", "عمليات القوى العاملة"],
  [IMG.files, "الملفات", "خزنة آمنة للمستندات"], [IMG.finance, "المالية", "ميزان المصروفات"],
  [IMG.compliance, "الامتثال", "استعداد دائم للأنظمة"], [IMG.growth, "التطوير", "مسار نمو واضح"],
  [IMG.data, "البيانات", "قرارات مبنية على بيانات منظمة"],
];

function tilt(e: React.PointerEvent<HTMLElement>) {
  const el = e.currentTarget, r = el.getBoundingClientRect();
  el.style.setProperty("--rx", `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
  el.style.setProperty("--ry", `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
}
function untilt(e: React.PointerEvent<HTMLElement>) { e.currentTarget.style.setProperty("--rx", "0deg"); e.currentTarget.style.setProperty("--ry", "0deg"); }

export function Home() {
  const groups = ["الموارد البشرية الأساسية", "إدارة المواهب", "إدارة النفقات"];
  const tabs = groups.map((g, gi) => ({ id: "g" + gi, label: g, content: (
    <div className="fcards">{PR.filter((p) => p[2] === g).map((p, i) => <Link className="fcard" key={p[0]} href={`/p/${p[0]}`}><MiniArt i={i + gi} hue={hueOf(p[0])} id={p[0]} /><b>{p[1]}</b><span>{p[3]}</span></Link>)}</div>) }));
  if (!priv) return <Hero title="منصة واحدة للموارد البشرية والمالية معًا" desc="" seed="home" slot="home" />;
  return (
    <>
      <header className="hero lux home">
        <img className="hero-bg" src={IMG.home} alt="" />
        <HeroRings />
        <div className="wrap hero-c">
          <div className="kick">نظام إدارة الموارد البشرية الخاص بشركة أوتاد الفهد</div>
          <h1 className="shine">أوتاد الفهد</h1>
          <p className="pill">نسخة تجريبية · للاستخدام الداخلي فقط</p>
          <p>الموارد البشرية والمالية في رؤية واحدة: الموظفون والرواتب والحضور والامتثال في منصة داخلية واحدة.</p>
          <Link className="sbtn gold lg" href="/login">الدخول إلى النظام</Link>
        </div>
      </header>
      <div className="sec"><div className="wrap st">
        <div><Counter to={17} />وحدة متكاملة</div><div><Counter to={36} />جدول بيانات محمي</div>
        <div><Counter to={4} />أدوار وصلاحيات</div><div><Counter to={6} />منصات حكومية يجهّز لها النظام بياناتك</div>
      </div></div>
      <div className="sec alt"><div className="wrap"><Reveal><h2>أقسام النظام</h2><p className="sub">مرّر المؤشر على أي بطاقة</p></Reveal>
        <div className="gallery">{GALLERY.map(([src, t, d]) => (
          <figure key={t} className="g3d" onPointerMove={tilt} onPointerLeave={untilt}><img src={src} alt={t} loading="eager" decoding="async" /><figcaption><b>{t}</b><span>{d}</span></figcaption></figure>
        ))}</div></div></div>
      <div className="sec"><div className="wrap split heart">
        <div><Reveal><h2>الموظف في قلب المنظومة</h2><p className="lead">كل موظف في أوتاد الفهد له بوابته: رصيد الإجازات وكشف الراتب والمستندات والطلبات في مكان واحد، بوضوح واحترام لخصوصيته.</p></Reveal>
          <Bullets items={["بوابة ذاتية لكل موظف", "طلبات وموافقات واضحة المسار", "إشعارات قبل انتهاء الوثائق"]} /></div>
        <figure className="g3d big" onPointerMove={tilt} onPointerLeave={untilt}><img src={IMG.meeting} alt="اجتماع الموارد البشرية" loading="eager" decoding="async" /></figure>
      </div></div>
      <div className="sec alt"><div className="wrap"><Reveal><h2>لماذا أوتاد؟</h2><p className="sub">ما يقدمه النظام لفريق الشركة</p></Reveal>
        <div className="fcards">{WHY.map((w, i) => <div className="fcard" key={w[0]}><MiniArt i={i} hue={hueOf(w[0])} /><b>{w[0]}</b><span>{w[1]}</span></div>)}</div></div></div>
      <div className="sec"><div className="wrap"><Reveal><h2>وحدات النظام</h2><p className="sub">اختر المجموعة لتستعرض وحداتها</p></Reveal><Tabs tabs={tabs} /></div></div>
      {!priv && <div className="sec alt"><div className="wrap"><h2>رحلتك مع أوتاد</h2><div className="steps">{JOURNEY.map((x, i) => <div className="step" key={x}><i>{i + 1}</i><span>{x}</span></div>)}</div></div></div>}
      <div className="sec alt"><div className="wrap split"><div><Reveal><h2>الامتثال للأنظمة السعودية</h2><p className="lead">يجهّز النظام البيانات ويتحقق من اكتمالها قبل الرفع. الربط المباشر مع المنصات الحكومية يتطلب اعتمادًا رسميًا.</p></Reveal><Bullets items={COMPLIANCE} /><p><Link className="sbtn o" href="/c/integrations">حالة التكاملات</Link></p></div>
        <figure className="g3d big" onPointerMove={tilt} onPointerLeave={untilt}><img src={IMG.compliance} alt="الاستعداد للامتثال" loading="lazy" /></figure></div></div>
      {!priv && <div className="sec"><div className="wrap"><Cards items={SO.slice(0, 11).map((p) => ({ href: `/s/${p[0]}`, title: p[1], text: p[3] }))} /></div></div>}
      <div className="sec"><div className="wrap"><Reveal><h2>المعرفة</h2><p className="sub">مقالات وأدوات ونماذج للفريق</p></Reveal>
        <Cards items={KN.map((p) => ({ href: `/k/${p[0]}`, title: p[1], text: p[2] }))} /></div></div>
      <div className="sec alt"><div className="wrap"><h2>الأسئلة الشائعة</h2>{FAQ.filter((f) => !/سعر|تسعير|اشتراك|باق|عرض/.test(f[0] + f[1])).map((f) => <details key={f[0]}><summary>{f[0]}</summary><p>{f[1]}</p></details>)}</div></div>
      <div className="sec"><div className="wrap cta lux-cta"><h2>نظام أوتاد الفهد الداخلي</h2><p>للموظفين المصرّح لهم فقط.</p><Link className="sbtn gold" href="/login">الدخول إلى النظام</Link></div></div>
    </>
  );
}
