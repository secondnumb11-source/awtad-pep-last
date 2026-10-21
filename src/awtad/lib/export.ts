// @ts-nocheck -- ported from original project (looser TS settings)
import { Row } from "./calc";
export type Cell = string | number | null | undefined;

// نص خالص من عقدة React (لتصدير جداول فيها وسوم وحالات ملوّنة)
export const nodeText = (n: any): string =>
  n == null || typeof n === "boolean" ? "" : typeof n === "string" || typeof n === "number" ? String(n) : Array.isArray(n) ? n.map(nodeText).join("") : n.props ? nodeText(n.props.children) : "";

// ===== Excel: ورقة بترويسة المنشأة وعرض من اليمين لليسار =====
export async function exportExcel(file: string, title: string, head: string[], rows: Cell[][], company: Row | null) {
  const XLSX = await import("xlsx");
  const aoa: any[][] = [[company?.name_ar || "أوتاد"], [title], [`تاريخ الإصدار: ${new Date().toISOString().slice(0, 10)}`], [], head, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = head.map((h, i) => ({ wch: Math.min(42, Math.max(10, h.length + 2, ...rows.slice(0, 60).map((r) => String(r[i] ?? "").length + 1))) }));
  const last = Math.max(0, head.length - 1);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: last } }, { s: { r: 1, c: 0 }, e: { r: 1, c: last } }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (title || "تقرير").slice(0, 28).replace(/[\\/?*[\]:]/g, "") || "تقرير");
  (wb as any).Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, file);
}

// ===== PDF: صفحة طباعة فاخرة بترويسة المنشأة؛ يُحفَظ PDF من نافذة الطباعة (Save as PDF) =====
export function printPdf(o: { title: string; subtitle?: string; head: string[]; rows: Cell[][]; company: Row | null; logoUrl?: string; landscape?: boolean; totals?: Cell[] }) {
  const c = o.company || {}, brand = /^#[0-9a-fA-F]{6}$/.test(c.brand_color || "") ? c.brand_color : "#0a6cc2";
  const esc = (s: any) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" } as any)[m]);
  const meta = [c.cr_number && `السجل التجاري: ${c.cr_number}`, c.vat_number && `الرقم الضريبي: ${c.vat_number}`, c.unified_no && `الرقم الموحد: ${c.unified_no}`, [c.address, c.city].filter(Boolean).join("، "), c.phone && `هاتف: ${c.phone}`, c.email, c.website].filter(Boolean).map(esc).join("<br>");
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(o.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
<style>
@page{size:A4 ${o.landscape ? "landscape" : "portrait"};margin:14mm 12mm 18mm}
*{box-sizing:border-box}body{font-family:"IBM Plex Sans Arabic",Tahoma,Arial,sans-serif;color:#1c2733;margin:0;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hd{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:12px;border-bottom:3px solid ${brand};position:relative}
.hd:after{content:"";position:absolute;bottom:-7px;left:0;right:0;height:1px;background:#c9a24a}
.brand{display:flex;align-items:center;gap:14px}.logo{max-height:66px;max-width:160px;object-fit:contain}
.brand h1{margin:0;font-size:19px;color:${brand}}.brand h2{margin:3px 0 0;font-size:11px;color:#6b7b8d;font-weight:500;direction:ltr;text-align:right}
.meta{font-size:9.5px;color:#4b5a69;line-height:1.75;text-align:left}
.hn{margin-top:10px;font-size:10px;color:#6b7b8d}
.tt{margin:26px 0 3px;font-size:18px;font-weight:700;color:#12263f}.tt:before{content:"";display:inline-block;width:5px;height:18px;background:#c9a24a;margin-inline-end:8px;vertical-align:-3px;border-radius:2px}
.sub{color:#6b7b8d;margin:0 0 14px;font-size:11px}
table{width:100%;border-collapse:collapse;margin-top:6px}th{background:${brand};color:#fff;padding:8px;font-weight:600;text-align:right;font-size:10.5px}
td{padding:6px 8px;border-bottom:1px solid #e3e9ef;vertical-align:top}tbody tr:nth-child(even) td{background:#f5f8fb}
tfoot td{font-weight:700;background:#eef2f7;border-top:2px solid ${brand}}
thead{display:table-header-group}tr{break-inside:avoid}
.ft{position:fixed;bottom:0;left:0;right:0;display:flex;justify-content:space-between;font-size:9px;color:#7a8896;border-top:1px solid #d8dfe6;padding-top:5px}
</style></head><body>
<div class="hd"><div class="brand">${o.logoUrl ? `<img class="logo" src="${esc(o.logoUrl)}" alt="">` : ""}<div><h1>${esc(c.name_ar || "")}</h1><h2>${esc(c.name_en || "")}</h2></div></div><div class="meta">${meta}</div></div>
${c.header_note ? `<div class="hn">${esc(c.header_note)}</div>` : ""}
<div class="tt">${esc(o.title)}</div><div class="sub">${esc(o.subtitle || "")} تاريخ الإصدار: ${new Date().toISOString().slice(0, 10)}</div>
<table><thead><tr>${o.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${o.rows.map((r) => `<tr>${r.map((x) => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody>
${o.totals ? `<tfoot><tr>${o.totals.map((x) => `<td>${esc(x)}</td>`).join("")}</tr></tfoot>` : ""}</table>
<div class="ft"><span>${esc(c.footer_note || c.name_ar || "")}</span><span>أُنشئ بواسطة أوتاد</span></div>
<script>window.addEventListener("load",function(){(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(function(){setTimeout(function(){window.print()},400)})})</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("اسمح بالنوافذ المنبثقة لتصدير PDF"); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
