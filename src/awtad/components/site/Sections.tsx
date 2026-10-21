// @ts-nocheck -- ported from original project (looser TS settings)
import { Sec } from "@/awtad/lib/site-pages";
import { Bullets } from "./parts";
import { CopyBox } from "./CopyBox";
import { MiniArt, hueOf } from "./Art";

// يعرض أقسام المحتوى التفصيلي لأي صفحة
export function Sections({ items, seed }: { items: Sec[]; seed: string }) {
  const h = hueOf(seed);
  return (
    <>
      {items.map((s, k) => (
        <div key={k} style={{ marginBottom: 30 }}>
          {s.title && <h2>{s.title}</h2>}
          {s.t === "p" && <p className="lead">{s.text}</p>}
          {s.t === "note" && <div className="notebox">{s.text}</div>}
          {s.t === "list" && <Bullets items={s.items as string[]} />}
          {s.t === "steps" && <div className="steps">{(s.items as string[]).map((x, i) => <div className="step" key={x}><i>{i + 1}</i><span>{x}</span></div>)}</div>}
          {s.t === "cards" && <div className="fcards">{(s.items as string[][]).map((x, i) => <div className="fcard" key={x[0]}><MiniArt i={i} hue={h} /><b>{x[0]}</b><span>{x[1]}</span></div>)}</div>}
          {s.t === "acc" && <div>{(s.items as string[][]).map((x, i) => <details key={x[0]} open={i === 0}><summary>{x[0]}</summary><p>{x[1]}</p></details>)}</div>}
          {s.t === "tpl" && <div className="fcards">{(s.items as string[][]).map((x) => <CopyBox key={x[0]} name={x[0]} body={x[1]} />)}</div>}
          {s.t === "table" && <div className="scroll"><table className="stable"><thead><tr>{s.head!.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{s.rows!.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}
        </div>
      ))}
    </>
  );
}
