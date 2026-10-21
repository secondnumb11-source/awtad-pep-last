import { notFound } from "@/awtad/nav";
import { Bullets, Cards, Hero } from "@/awtad/components/site/parts";
import { Tabs } from "@/awtad/components/site/Tabs";
import { Art, MiniArt, hueOf } from "@/awtad/components/site/Art";
import { DETAILS, SOLUTION_DETAILS } from "@/awtad/lib/site-details";
import { PAGES } from "@/awtad/lib/site-pages";
import { Sections } from "@/awtad/components/site/Sections";
import { CO, CONTACT, KN, PR, SO } from "@/awtad/lib/site-data";
import { isHiddenCommercial } from "@/awtad/lib/brand";
import { PrivateNotice } from "@/awtad/components/site/Brand";

function _gsp() {
  return [...PR.map((p) => ({ sec: "p", id: p[0] })), ...SO.map((p) => ({ sec: "s", id: p[0] })), ...KN.map((p) => ({ sec: "k", id: p[0] })), ...CO.map((p) => ({ sec: "c", id: p[0] }))];
}

export function SitePage({ sec, id }: { sec: string; id: string }) {
  if (sec === "p") {
    const p = PR.find((x) => x[0] === id); if (!p) return notFound();
    const dt = DETAILS[id], h = hueOf(id);
    const rel = PR.filter((x) => x[2] === p[2] && x[0] !== id).slice(0, 4).map((x) => ({ href: `/p/${x[0]}`, title: x[1], text: x[3] }));
    const tabs = dt ? [
      { id: "ov", label: "نظرة عامة", content: <div className="split"><div><h2>{dt.headline}</h2><p className="lead">{dt.intro}</p><Bullets items={p[4]} /></div><div><Art hue={h} /></div></div> },
      { id: "ft", label: "المميزات التفصيلية", content: <div className="fcards">{dt.features.map((f, i) => <div className="fcard" key={f[0]}><MiniArt i={i} hue={h} /><b>{f[0]}</b><span>{f[1]}</span></div>)}</div> },
      { id: "how", label: "كيف يعمل", content: <div className="steps">{dt.steps.map((s2, i) => <div className="step" key={s2}><i>{i + 1}</i><span>{s2}</span></div>)}</div> },
      { id: "faq", label: "أسئلة شائعة", content: <div>{dt.faq.map((q) => <details key={q[0]} open><summary>{q[0]}</summary><p>{q[1]}</p></details>)}</div> },
    ] : [{ id: "ov", label: "نظرة عامة", content: <Bullets items={p[4]} /> }];
    return (<><Hero title={p[1]} desc={p[3]} kicker={p[2]} seed={id} slot="p" />
      <div className="sec"><div className="wrap"><Tabs tabs={tabs} /><h3 style={{ marginTop: 32 }}>منتجات ذات صلة</h3><Cards items={rel} /></div></div></>);
  }
  if (sec === "s") {
    const p = SO.find((x) => x[0] === id); if (!p) return notFound();
    const sd = SOLUTION_DETAILS[id], h = hueOf(id);
    const prods = (sd?.products || []).map((k) => PR.find((x) => x[0] === k)).filter(Boolean) as typeof PR;
    const tabs = [
      { id: "ov", label: "نظرة عامة", content: <div className="split"><div><h2>أوتاد لـ{p[1]}</h2><p className="lead">{p[3]}</p><Bullets items={[`أتمتة الرواتب والحضور حسب طبيعة ${p[1]}`, "امتثال تلقائي لمتطلبات نظام العمل", "تقارير تكلفة وإنتاجية جاهزة"]} /></div><div><Art hue={h} /></div></div> },
      { id: "ch", label: "التحديات والحلول", content: <div className="fcards">{(sd?.challenges || []).map((c, i) => <div className="fcard" key={c}><MiniArt i={i} hue={h} /><b>التحدي {i + 1}</b><span>{c}</span></div>)}</div> },
      { id: "pr", label: "المنتجات المناسبة", content: <Cards items={prods.map((x) => ({ href: `/p/${x[0]}`, title: x[1], text: x[3] }))} /> },
    ];
    return (<><Hero title={"أوتاد لـ" + p[1]} desc={p[3]} kicker={"حلول " + p[2]} seed={id} slot="s" />
      <div className="sec"><div className="wrap"><Tabs tabs={tabs} /><h3 style={{ marginTop: 32 }}>حلول أخرى</h3>
        <Cards items={SO.filter((x) => x[2] === p[2] && x[0] !== id).slice(0, 4).map((x) => ({ href: `/s/${x[0]}`, title: x[1], text: x[3] }))} /></div></div></>);
  }
  if (sec === "k") {
    const p = KN.find((x) => x[0] === id); if (!p) return notFound();
    return (<><Hero title={p[1]} desc={p[2]} kicker="المعرفة" seed={id} slot="k" />
      <div className="sec"><div className="wrap">
        {PAGES[id] && <Sections items={PAGES[id]} seed={id} />}
        {id === "tools" && <Cards items={[{ title: "حاسبة الراتب", text: "تقسيم الراتب الإجمالي إلى أساسي وسكن ونقل مع حساب تأمينات الموظف." }, { title: "حاسبة نهاية الخدمة", text: "المادتان 84 و85 مع تخفيض الاستقالة." }, { title: "حاسبة النطاقات", text: "نسبة التوطين وعدد السعوديين المطلوب للارتقاء." }, { title: "مقارنة الرواتب", text: "نطاقات الوظائف ومقارنة موظفيك بها." }]} />}
      </div></div></>);
  }
  if (sec === "c") {
    const p = CO.find((x) => x[0] === id); if (!p) return notFound();
    if (isHiddenCommercial(id)) return <PrivateNotice />;
    return (<><Hero title={p[1]} desc={p[2]} kicker="أوتاد" seed={id} slot="c" />
      <div className="sec"><div className="wrap">
        {PAGES[id] && <Sections items={PAGES[id]} seed={id} />}
        {id === "contact" && <p>البريد: {CONTACT.mail}<br />المبيعات: {CONTACT.sales}<br />الهاتف: {CONTACT.tel}<br />العنوان: {CONTACT.addr}</p>}
        {id === "demo" && <form className="demo"><input placeholder="الاسم" required /><input placeholder="اسم المنشأة" required /><input placeholder="البريد الإلكتروني" type="email" required /><input placeholder="عدد الموظفين" type="number" /><button className="sbtn" type="button">إرسال الطلب (نموذج تجريبي)</button></form>}
      </div></div></>);
  }
  return notFound();
}
