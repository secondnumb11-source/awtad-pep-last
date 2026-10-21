// @ts-nocheck -- ported from original project (looser TS settings)
import { useData } from "@/awtad/lib/data";
import { Cell, exportExcel, printPdf } from "@/awtad/lib/export";

// أزرار تصدير Excel وPDF بترويسة المنشأة
export function ExportBar({ title, head, rows, landscape, totals }: { title?: string; head: string[]; rows: Cell[][]; landscape?: boolean; totals?: Cell[] }) {
  const { company, logoUrl } = useData();
  const t = () => title || (typeof document !== "undefined" ? document.querySelector(".bc span")?.textContent : "") || "تقرير";
  const file = () => `awtad-${String(t()).replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
  return (
    <span className="noprint expbar">
      <button className="btn sm" onClick={() => exportExcel(file() + ".xlsx", t(), head, totals ? [...rows, totals] : rows, company)}>Excel</button>
      <button className="btn sm" onClick={() => printPdf({ title: t(), head, rows, company, logoUrl, landscape: landscape ?? head.length > 6, totals })}>PDF</button>
    </span>
  );
}
