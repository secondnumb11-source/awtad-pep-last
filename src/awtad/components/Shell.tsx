// @ts-nocheck -- ported from original project (looser TS settings)
import { Link } from "@/awtad/nav";
import { usePathname, useRouter } from "@/awtad/nav";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/awtad/lib/auth";
import { useData } from "@/awtad/lib/data";
import { addDays, hijri, today } from "@/awtad/lib/calc";
import { MODULES, canOpen } from "./registry";
import { computeAlerts, SEV, SEVC } from "./alerts";
import { NAV, NavNode, SWITCH } from "./nav";
import { Ic } from "./Icons";
import logo from "@/assets/awtad/logo.png";
import { imageForPath } from "@/awtad/lib/brand";

const QUICK: [string, string][] = [["إضافة موظف", "/employees"], ["طلب إجازة", "/leaves"], ["تسجيل حضور", "/attendance"], ["طلب مصروف", "/expenses"], ["رحلة عمل", "/trips"], ["طلب استئذان", "/req-perm"]];

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { d, err, loading, reload } = useData();
  const path = usePathname(), router = useRouter();
  // اللوحة الجانبية: كاملة على الشاشات الكبيرة، شريط أيقونات يتوسع عند التمرير على المتوسطة، ومخفية على الصغيرة
  const [auto, setAuto] = useState<"full" | "rail" | "hidden">("full");
  const [manual, setManual] = useState<"full" | "rail" | null>(null);
  const [open, setOpen] = useState(false), [menu, setMenu] = useState<"" | "user" | "quick" | "sw" | "bell" | "fav" | "help">(""), [q, setQ] = useState("");
  const [openNodes, setOpenNodes] = useState<Record<string, boolean>>({}), [favs, setFavs] = useState<string[]>([]);
  const lastCat = useRef(""), inp = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const calc = () => { const x = window.innerWidth, c = x >= 1100 ? "full" : x >= 760 ? "rail" : "hidden"; if (c !== lastCat.current) { lastCat.current = c; setAuto(c as any); setManual(null); if (c !== "hidden") setOpen(false); } };
    calc(); window.addEventListener("resize", calc); return () => window.removeEventListener("resize", calc);
  }, []);
  useEffect(() => { try { setFavs(JSON.parse(localStorage.getItem("awtad_fav_mods") || "[]")); } catch {} }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inp.current?.focus(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
  useEffect(() => { setOpen(false); setMenu(""); setQ(""); }, [path]);
  const mode = auto === "hidden" ? "hidden" : manual ?? auto;
  const toggleSide = () => (mode === "hidden" ? setOpen(!open) : setManual(mode === "full" ? "rail" : "full"));

  const role = user?.role || "";
  const mods = useMemo(() => MODULES.filter((m) => canOpen(m, role, user?.moduleAccess)), [role, user?.moduleAccess]);
  const allowed = useMemo(() => new Set(mods.map((m) => m.key)), [mods]);
  const cur = MODULES.find((m) => path === "/" + m.key);
  const curKey = path.replace(/^\//, "");

  // تقليم الشجرة بحسب الصلاحيات
  const prune = (n: NavNode): NavNode | null => {
    if (n.kids) { const k = n.kids.map(prune).filter(Boolean) as NavNode[]; return k.length ? { ...n, kids: k } : null; }
    return n.soon || (n.k && allowed.has(n.k)) ? n : null;
  };
  const tree = useMemo(() => NAV.map((g) => ({ ...g, items: g.items.map(prune).filter(Boolean) as NavNode[] })).filter((g) => g.items.length), [allowed]); // eslint-disable-line
  const hasKey = (n: NavNode, k: string): boolean => n.k === k || !!n.kids?.some((c) => hasKey(c, k));
  const isOpen = (id: string, n: NavNode) => (id in openNodes ? openNodes[id] : hasKey(n, curKey));

  const results = q ? mods.filter((m) => m.title.includes(q)).slice(0, 7) : [];
  const alerts = computeAlerts(d), notif = alerts.filter((a) => a.sev >= 1).length;
  const errTables = Object.keys(err);
  const initials = (user?.name || "؟").trim().slice(0, 2).toUpperCase();
  const toggleFav = () => { if (!cur) return; const f = favs.includes(cur.key) ? favs.filter((x) => x !== cur.key) : [...favs, cur.key]; setFavs(f); try { localStorage.setItem("awtad_fav_mods", JSON.stringify(f)); } catch {} };
  const bar = (k: "user" | "quick" | "sw" | "bell" | "fav" | "help") => setMenu(menu === k ? "" : k);

  const Row = ({ n, id, lvl }: { n: NavNode; id: string; lvl: number }) => {
    const on = !!n.k && n.k === curKey;
    if (n.kids) {
      const o = isOpen(id, n);
      return (<div>
        <button className={"nvi" + (!lvl ? " top" : "")} onClick={() => setOpenNodes({ ...openNodes, [id]: !o })}>{!lvl && n.ic && <Ic n={n.ic} />}<span className="lbl">{n.t}</span><span className={"cv lbl" + (o ? " dn" : "")}><Ic n="chev" s={14} /></span></button>
        {o && <div className="sub">{n.kids.map((c, i) => <Row key={id + i} n={c} id={id + "." + i} lvl={lvl + 1} />)}</div>}
      </div>);
    }
    if (n.soon || !n.k) return <div className="nvi soon" title="قريبًا">{!lvl && n.ic && <Ic n={n.ic} />}<span className="lbl">{n.t}</span><span className="lbl lk"><Ic n="lock" s={14} /></span></div>;
    return <Link href={"/" + n.k} title={n.t} className={"nvi" + (!lvl ? " top" : "") + (on ? " on" : "")}>{!lvl && n.ic && <Ic n={n.ic} />}<span className="lbl">{n.t}</span></Link>;
  };

  return (
    <div id="shell">
      {open && mode === "hidden" && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className={"sidewrap " + mode + (open ? " open" : "")}>
        <aside>
          <div className="brand lux-b"><img className="logo-img" src={logo} alt="شعار أوتاد الفهد" /><span className="lbl bt"><b>أوتاد الفهد</b><small>نظام الموارد البشرية</small></span></div>
          <nav>
            {tree.map((g, gi) => (
              <div key={g.t}><div className="gh"><span className="lbl">{g.t}</span><hr /></div>
                {g.items.map((n, i) => <Row key={g.t + i} n={n} id={`${gi}.${i}`} lvl={0} />)}</div>
            ))}
          </nav>
        </aside>
      </div>
      <section>
        <header className="topbar">
          <button className="iconbtn" onClick={toggleSide} aria-label="إظهار أو إخفاء القائمة الجانبية" title="إظهار / إخفاء القائمة"><Ic n="menu" /></button>
          <div className="usermenu">
            <button className="btn soft swbtn" onClick={() => bar("sw")}><Ic n="layers" s={18} />الإدارات<Ic n="chevd" s={14} /></button>
            {menu === "sw" && <div className="drop mega">{SWITCH.map((c) => <div key={c.t}><h4>{c.t}</h4>{c.items.filter((i) => allowed.has(i.k)).map((i) => <Link key={i.t} href={"/" + i.k}><span className="mic"><Ic n={i.ic} s={18} /></span><span><b>{i.t}</b><small>{i.d}</small></span></Link>)}</div>)}</div>}
          </div>
          <div className="usermenu">
            <button className="iconbtn" onClick={() => bar("fav")} aria-label="المفضلة" title="المفضلة"><Ic n="star" /></button>
            {menu === "fav" && <div className="drop">{favs.length ? favs.map((k) => MODULES.find((m) => m.key === k)).filter((m) => m && allowed.has(m.key)).map((m) => <Link key={m!.key} href={"/" + m!.key}><Ic n={m!.icon} s={16} />{m!.title}</Link>) : <div className="mut" style={{ padding: 10 }}>لا توجد مفضلات. اضغط النجمة بجانب مسار الصفحة لإضافتها.</div>}</div>}
          </div>
          <div className="search">
            <Ic n="search" s={18} />
            <input ref={inp} value={q} placeholder="ابحث في الصفحات   [CTRL+K]" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && results[0]) router.push("/" + results[0].key); }} />
            {(results.length > 0 || q.length > 2) && <div className="drop">{results.map((m) => <Link key={m.key} href={"/" + m.key}><Ic n={m.icon} s={16} />{m.title}</Link>)}{q.length > 2 && allowed.has("ai-reports") && <Link href={"/ai-reports?q=" + encodeURIComponent(q)}><Ic n="chart" s={16} />✨ اطلب من المساعد: {q}</Link>}</div>}
          </div>
          <div className="usermenu">
            <button className="iconbtn bell" onClick={() => bar("bell")} aria-label="الإشعارات"><Ic n="bell" />{notif > 0 && <span className="badge">{notif}</span>}</button>
            {menu === "bell" && <div className="drop">{alerts.slice(0, 7).map((a, i) => <Link key={i} href={a.href}><span className={"chip " + SEVC[a.sev]}>{SEV[a.sev]}</span>{a.title}</Link>)}{!alerts.length && <div className="mut" style={{ padding: 10 }}>لا توجد تنبيهات</div>}<Link href="/alerts"><b>عرض كل التنبيهات ({alerts.length})</b></Link></div>}
          </div>
          <div className="usermenu">
            <button className="avatar" onClick={() => bar("user")} aria-label="قائمة المستخدم">{initials}<i /></button>
            {menu === "user" && <div className="drop"><div className="uinfo"><b>{user?.name}</b><span>{user?.label}</span></div><Link href="/portal"><Ic n="users" s={16} />بوابتي</Link><button onClick={logout}><Ic n="out" s={16} />تسجيل الخروج</button></div>}
          </div>
        </header>
        <div className="crumbs">
          <div className="row" style={{ alignItems: "center" }}>
            <div className="usermenu">
              <button className="btn quick" onClick={() => bar("quick")}><Ic n="bolt" s={16} />إجراءات سريعة</button>
              {menu === "quick" && <div className="drop">{QUICK.filter(([, h]) => allowed.has(h.slice(1))).map(([l, h]) => <Link key={h} href={h}><Ic n="plus" s={16} />{l}</Link>)}</div>}
            </div>
            <button className="iconbtn" onClick={toggleFav} title="إضافة الصفحة للمفضلة" aria-label="مفضلة"><span style={{ color: cur && favs.includes(cur.key) ? "#e0a526" : undefined }}><Ic n="star" s={18} /></span></button>
            <button className="iconbtn" onClick={() => reload()} title="تحديث البيانات" aria-label="تحديث"><Ic n="refresh" s={18} /></button>
          </div>
          <div className="bc"><Link href="/dashboard"><Ic n="home" s={18} /></Link><Ic n="chev" s={14} /><span>{cur?.title || ""}</span><small className="mut" style={{ marginInlineStart: 12 }}>{hijri()} هـ</small></div>
        </div>
        <div className="phead"><div className="ph-t"><small>أوتاد الفهد · الموارد البشرية</small><h1>{cur?.title || "لوحة التحكم"}</h1><span className="pill">نسخة تجريبية · غير معتمدة من الشركة</span></div><img src={imageForPath(curKey || "dashboard")} alt="" /></div>
        <main>
          {loading && <div className="card mut">جارٍ تحميل البيانات...</div>}
          {errTables.length > 0 && <div className="card er">تعذّر تحميل: {errTables.map((t) => "awtad_" + t).join("، ")}. افتح «فحص الاتصال» لمعرفة السبب. ({err[errTables[0]]})</div>}
          {children}
        </main>
        <div className="support">
          {menu === "help" && <div className="card supcard"><b>الدعم</b><div className="mut">support@awtad.example<br />+966 11 000 0000<br />(بيانات مؤقتة)</div><Link className="btn sm" href="/c/contact">صفحة التواصل</Link></div>}
          <button className="supbtn" onClick={() => bar("help")} aria-label="الدعم"><Ic n="help" s={22} /></button>
        </div>
      </section>
    </div>
  );
}
