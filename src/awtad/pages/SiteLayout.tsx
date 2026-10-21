import { Link } from "@/awtad/nav";
import { ReactNode } from "react";
import { CO, CONTACT, KN, PR, SO } from "@/awtad/lib/site-data";
import { BrandLockup, TrialTicker } from "@/awtad/components/site/Brand";
import { COMMERCIAL_PAGES, COMPANY, NOT_COMMERCIAL, privateCompanyPresentation as priv } from "@/awtad/lib/brand";

const SUITES = ["الموارد البشرية الأساسية", "إدارة المواهب", "إدارة النفقات"];
const SOL = ["قطاع", "حجم", "قسم"], SOLN: Record<string, string> = { "قطاع": "حسب القطاع", "حجم": "حسب حجم المنشأة", "قسم": "حسب القسم" };
const companyLinks = () => CO.filter((p) => !(priv && COMMERCIAL_PAGES.includes(p[0])) && p[0] !== "demo");

function Menu({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return <div className="mi"><Link href={href} className="mt">{title} <small>▾</small></Link><div className="mp">{children}</div></div>;
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site">
      <TrialTicker />
      <div className="nb glass">
        <BrandLockup />
        <nav className="mm" aria-label="القائمة الرئيسية">
          <Menu title="الأقسام" href="/p/hr">{SUITES.map((g) => <div key={g}><h4>{g}</h4>{PR.filter((p) => p[2] === g).map((p) => <Link key={p[0]} href={`/p/${p[0]}`}>{p[1]}</Link>)}</div>)}</Menu>
          {!priv && <Menu title="الحلول" href="/s/retail">{SOL.map((t) => <div key={t}><h4>{SOLN[t]}</h4>{SO.filter((p) => p[2] === t).map((p) => <Link key={p[0]} href={`/s/${p[0]}`}>{p[1]}</Link>)}</div>)}</Menu>}
          <Menu title="المعرفة" href="/k/blog"><div><h4>الموارد</h4>{KN.map((p) => <Link key={p[0]} href={`/k/${p[0]}`}>{p[1]}</Link>)}</div></Menu>
          <Menu title="الشركة" href="/c/about"><div><h4>{COMPANY}</h4>{companyLinks().map((p) => <Link key={p[0]} href={`/c/${p[0]}`}>{p[1]}</Link>)}</div></Menu>
          {!priv && <Link className="mt plain" href="/c/pricing">الأسعار</Link>}
        </nav>
        <Link className="sbtn gold" href="/login">الدخول إلى النظام</Link>
        {!priv && <Link className="sbtn" href="/c/demo">اطلب عرضًا تجريبيًا</Link>}
      </div>
      {children}
      {priv ? (
        <footer className="lux-f"><div className="wrap ff">
          <BrandLockup light />
          <div className="ff-l">{PR.slice(0, 6).map((p) => <Link key={p[0]} href={`/p/${p[0]}`}>{p[1]}</Link>)}<Link href="/c/about">عن الشركة</Link><Link href="/c/contact">تواصل داخلي</Link></div>
          <div className="ff-c">© {COMPANY} — نسخة تجريبية للاستخدام الداخلي · {NOT_COMMERCIAL}</div>
        </div></footer>
      ) : (
        <footer><div className="wrap fgrid5">
          <div><h4>المنتجات</h4>{SUITES.map((g) => <div key={g} className="fg"><b>{g}</b>{PR.filter((p) => p[2] === g).map((p) => <Link key={p[0]} href={`/p/${p[0]}`}>{p[1]}</Link>)}</div>)}</div>
          <div><h4>الحلول</h4>{SOL.map((t) => <div key={t} className="fg"><b>{SOLN[t]}</b>{SO.filter((p) => p[2] === t).map((p) => <Link key={p[0]} href={`/s/${p[0]}`}>{p[1]}</Link>)}</div>)}</div>
          <div><h4>المعرفة</h4>{KN.map((p) => <Link key={p[0]} href={`/k/${p[0]}`}>{p[1]}</Link>)}</div>
          <div><h4>الشركة</h4>{CO.map((p) => <Link key={p[0]} href={`/c/${p[0]}`}>{p[1]}</Link>)}</div>
          <div><h4>تواصل</h4>الدعم: support@awtad.example<br />المبيعات: {CONTACT.sales}<br />الهاتف: {CONTACT.tel}<br />{CONTACT.addr}</div>
        </div></footer>
      )}
    </div>
  );
}
