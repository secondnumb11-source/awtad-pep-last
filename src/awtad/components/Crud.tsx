// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useState } from "react";
import { useData } from "@/awtad/lib/data";
import { useAuth } from "@/awtad/lib/auth";
import { ins, del } from "@/awtad/lib/supabase";
import { Row, Settings, n } from "@/awtad/lib/calc";
import { ExportBar } from "./ExportBar";
import { nodeText } from "@/awtad/lib/export";

export type Field = { k: string; l: string; t: "t" | "n" | "d" | "h" | "e" | "r" | "s" | "b" | "c"; ref?: string; list?: string; opts?: string[]; req?: boolean };
export type Ctx = { d: Record<string, Row[]>; set: Settings; reload: () => Promise<void>; emp: (id: any) => string };
export type Act = { l: string; run: (r: Row, c: Ctx) => Promise<void>; show?: (r: Row) => boolean; roles?: string[] };
export type Cfg = {
  table: string; f: Field[]; tree?: boolean; st?: boolean; act?: Act[];
  calc?: { l: string; fn: (r: Row) => ReactNode }[];
  readonly?: boolean; desc?: boolean; where?: (r: Row) => boolean; fixed?: Row;
  pre?: (o: Row, s: Settings, c: Ctx) => Row; after?: (c: Ctx) => ReactNode;
  addRoles?: string[]; // من يضيف (الافتراضي: مدير النظام والموارد البشرية والمدير)
};
const MGR = ["admin", "hr", "manager"];

export function refLabel(table: string, r: Row | undefined, emp: (id: any) => string) {
  if (!r) return "—";
  if (table === "petty_cash") return `#${r.id} ${emp(r.employee_id)} (${n(r.amount)})`;
  return r.name || r.title || `#${r.id}`;
}
const stCls = (s: string) => (/^معتمد|^مكتمل/.test(s) ? "ok" : /^مرفوض/.test(s) ? "er" : "wa");

export function Crud({ cfg }: { cfg: Cfg }) {
  const ctx = useData();
  const { user } = useAuth();
  const { d, set, reload, emp } = ctx;
  const [form, setForm] = useState<Row>({});
  const [msg, setMsg] = useState("");
  const role = user?.role || "";
  const canAdd = !cfg.readonly && (cfg.addRoles || MGR).includes(role);
  const canDel = !cfg.readonly && ["admin", "hr"].includes(role);

  let rows: Row[] = (d[cfg.table] || []).filter((r) => !cfg.where || cfg.where(r));
  const formFields = cfg.f.filter((f) => f.t !== "b" && !(cfg.fixed && f.k in cfg.fixed));
  if (cfg.tree) {
    const out: Row[] = [];
    const walk = (p: any, depth: number) => rows.filter((r) => (r.parent_id || null) == p).forEach((r) => { out.push({ ...r, _d: depth }); walk(r.id, depth + 1); });
    walk(null, 0); rows = out;
  }
  if (cfg.desc) rows = [...rows].reverse().slice(0, 200);
  const optList = (f: Field): { v: string; l: string }[] =>
    f.t === "e" ? (d.employees || []).map((x) => ({ v: String(x.id), l: x.name }))
    : f.t === "r" ? [{ v: "", l: "—" }, ...(d[f.ref!] || []).map((x) => ({ v: String(x.id), l: refLabel(f.ref!, x, emp) }))]
    : (f.opts || []).map((o) => { const [v, l] = o.split("|"); return { v, l: l ?? v }; });
  const cur = (f: Field) => form[f.k] ?? (["e", "r", "s"].includes(f.t) ? optList(f)[0]?.v ?? "" : "");

  async function add() {
    let o: Row = {};
    for (const f of formFields) {
      let v: any = cur(f);
      if (v === "" || v === undefined) v = null;
      else if (f.t === "n") v = +v;
      else if (f.t === "e" || f.t === "r") v = +v;
      if (f.req && v === null) { setMsg(`الحقل «${f.l}» مطلوب`); return; }
      o[f.k] = v;
    }
    o = { ...o, ...cfg.fixed };
    try { if (cfg.pre) o = cfg.pre(o, set, ctx); await ins(cfg.table, o); setForm({}); setMsg(""); await reload(); }
    catch (e: any) { setMsg(e.message); }
  }
  async function run(a: Act, r: Row) { try { await a.run(r, ctx); await reload(); setMsg(""); } catch (e: any) { setMsg(e.message); } }
  async function remove(r: Row) { if (!confirm("حذف السجل؟")) return; try { await del(cfg.table, r.id); await reload(); } catch (e: any) { setMsg(e.message); } }
  const cell = (f: Field, r: Row) => {
    const v = r[f.k];
    if (f.t === "e") return emp(v);
    if (f.t === "r") return refLabel(f.ref!, (d[f.ref!] || []).find((x) => x.id == v), emp);
    if (f.t === "b") return v ? <span className="ok">✓</span> : "—";
    if (f.t === "n") return n(v);
    if (f.t === "h") return v ? String(v).slice(0, 5) : "";
    if (f.t === "s") return optList(f).find((o) => o.v === String(v))?.l ?? v;
    return v ?? "";
  };

  return (
    <>
      {msg && <div className="card er">{msg}</div>}
      {canAdd && (
        <div className="card">
          <h2>إضافة سجل جديد</h2>
          <div className="fgrid">
            {formFields.map((f) => (
              <label key={f.k} className="fld"><span>{f.l}{f.req && <b className="req"> *</b>}</span>
                {["e", "r", "s"].includes(f.t) ? (
                  <select value={cur(f)} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })}>
                    {optList(f).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                ) : f.t === "c" ? (
                  <><input list={"dl_" + f.k} value={cur(f)} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} /><datalist id={"dl_" + f.k}>{(d.lists || []).filter((x) => x.kind === f.list).map((x) => <option key={x.id} value={x.name} />)}</datalist></>
                ) : (
                  <input type={f.t === "n" ? "number" : f.t === "d" ? "date" : f.t === "h" ? "time" : "text"} value={cur(f)} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                )}
              </label>
            ))}
          </div>
          <div className="actions"><button className="btn" onClick={add}>حفظ ✓</button><button className="btn cancel" onClick={() => { setForm({}); setMsg(""); }}>إلغاء ✕</button></div>
        </div>
      )}
      <div className="card scroll">
        <div style={{ textAlign: "end" }}><ExportBar head={[...cfg.f.map((f) => f.l), ...(cfg.st ? ["الحالة"] : []), ...(cfg.calc || []).map((c) => c.l)]} rows={rows.map((r) => [...cfg.f.map((f) => nodeText(cell(f, r))), ...(cfg.st ? [r.status] : []), ...(cfg.calc || []).map((c) => nodeText(c.fn(r)))])} /></div>
        <table>
          <thead><tr>{cfg.f.map((f) => <th key={f.k}>{f.l}</th>)}{cfg.st && <th>الحالة</th>}{(cfg.calc || []).map((c) => <th key={c.l}>{c.l}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {cfg.f.map((f, i) => <td key={f.k}>{i === 0 && cfg.tree ? "— ".repeat(r._d) : ""}{cell(f, r)}</td>)}
                {cfg.st && <td className={stCls(r.status)}>{r.status}</td>}
                {(cfg.calc || []).map((c) => <td key={c.l}>{c.fn(r)}</td>)}
                <td>
                  {(cfg.act || []).filter((a) => (a.roles || MGR).includes(role) && (!a.show || a.show(r))).map((a) => <button key={a.l} className="btn sm" onClick={() => run(a, r)}>{a.l}</button>)}
                  {canDel && <button className="btn sm dng" onClick={() => remove(r)}>حذف</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={cfg.f.length + 3} className="mut">لا توجد بيانات</td></tr>}
          </tbody>
        </table>
      </div>
      {cfg.after?.(ctx)}
    </>
  );
}
