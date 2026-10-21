import { Link } from "@/awtad/nav";
import { IMG, privateCompanyPresentation } from "@/awtad/lib/brand";

const SLOT_IMG: Record<string, string> = { home: IMG.home, p: IMG.strategy, s: IMG.meeting, k: IMG.employees, c: IMG.home };
const PRODUCT_IMG: Record<string, string> = { hr: IMG.employees, payroll: IMG.payroll, attendance: IMG.attendance, compliance: IMG.compliance, ats: IMG.talent, performance: IMG.growth, lms: IMG.growth, engagement: IMG.meeting, comp: IMG.payroll, workforce: IMG.data, expense: IMG.finance, petty: IMG.finance, travel: IMG.finance, journal: IMG.data, accounting: IMG.finance, payments: IMG.payroll, benefits: IMG.employees };

export const Hero = ({ title, desc, kicker, seed, slot }: { title: string; desc: string; kicker?: string; seed: string; slot: string }) => {
  const img = PRODUCT_IMG[seed] || SLOT_IMG[slot] || IMG.home;
  return (
    <div className="hero lux">
      <img className="hero-bg" src={img} alt="" />
      <div className="wrap hero-c">
        {kicker && <div className="kick">{kicker}</div>}
        <h1>{title}</h1><p>{desc}</p>
        {privateCompanyPresentation
          ? <Link className="sbtn gold" href="/login">الدخول إلى النظام</Link>
          : <Link className="sbtn" href="/c/demo">اطلب عرضًا تجريبيًا</Link>}
      </div>
    </div>
  );
};

export const Cards = ({ items }: { items: { href?: string; title: string; text: string }[] }) => (
  <div className="gd">{items.map((i) => i.href
    ? <Link key={i.title} className="scard" href={i.href}><b>{i.title}</b><span>{i.text}</span></Link>
    : <div key={i.title} className="scard"><b>{i.title}</b><span>{i.text}</span></div>)}</div>
);
export const Bullets = ({ items }: { items: string[] }) => <>{items.map((x) => <div className="bl" key={x}><i>✓</i><span>{x}</span></div>)}</>;
