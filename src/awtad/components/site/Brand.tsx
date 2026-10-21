import { Link } from "@/awtad/nav";
import logo from "@/assets/awtad/logo.png";
import logoWhite from "@/assets/awtad/logo-white.png";
import { IDENTITY, NOT_COMMERCIAL, TICKER } from "@/awtad/lib/brand";

export function TrialTicker() {
  const item = <span className="tk-i">{TICKER}<i aria-hidden="true">◆</i></span>;
  return (
    <div className="ticker" role="note" aria-label={TICKER}>
      <div className="tk-track" aria-hidden="true">{item}{item}{item}{item}{item}{item}</div>
    </div>
  );
}

export function BrandLockup({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={"lockup" + (light ? " light" : "") + (compact ? " compact" : "")} aria-label={IDENTITY}>
      <img src={light ? logoWhite : logo} alt="شعار أوتاد الفهد" />
      <span className="lk-t"><b>{IDENTITY}</b><small>{NOT_COMMERCIAL}</small></span>
    </Link>
  );
}

export function PrivateNotice() {
  return (
    <div className="sec"><div className="wrap private">
      <img src={logo} alt="" />
      <h2>نظام أوتاد الفهد – للاستخدام الداخلي</h2>
      <p className="lead">هذا القسم غير متاح في النسخة الداخلية الحالية. النظام مخصص لموظفي شركة أوتاد الفهد فقط.</p>
      <Link className="sbtn" href="/login">الدخول إلى النظام</Link>
    </div></div>
  );
}

export { logo, logoWhite };
