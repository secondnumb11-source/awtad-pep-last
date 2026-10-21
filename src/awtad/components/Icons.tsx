// @ts-nocheck -- ported from original project (looser TS settings)
// أيقونات أصلية بسيطة (SVG) لأوتاد
const P: Record<string, string> = {
  home: "M3 11l9-8 9 8v10H3zM9 21v-6h6v6",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  file: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  users: "M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c0-4 4-6 8-6s8 2 8 6",
  flow: "M6 6a2 2 0 1 0 0 .01M18 6a2 2 0 1 0 0 .01M12 18a2 2 0 1 0 0 .01M6 8v2c0 2 6 2 6 6M18 8v2c0 2-6 2-6 6",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  cal: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  wal: "M3 7h18v13H3zM3 7l3-3h12l3 3M16 14h2",
  bag: "M3 8h18v12H3zM9 8V5h6v3",
  rc: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  pin: "M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12zM12 11a2 2 0 1 0 0-.01",
  plane: "M2 12l20-8-8 20-3-9zM11 15l11-11",
  award: "M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8 14l-2 7 6-3 6 3-2-7",
  book: "M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6",
  smile: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 14c1 2 7 2 8 0M9 9v1M15 9v1",
  calc: "M6 3h12v18H6zM9 7h6M9 11h2M13 11h2M9 15h2M13 15h2",
  target: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  gear: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2",
  menu: "M4 6h16M4 12h16M4 18h16",
  out: "M9 4H5v16h4M16 8l4 4-4 4M20 12H9",
  plus: "M12 5v14M5 12h14",
  db: "M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0zM4 12c0 2 16 2 16 0M4 6c0 2 16 2 16 0",
  chev: "M15 6l-6 6 6 6",
  doc: "M7 3h10v18H7zM10 8h4M10 12h4M10 16h2",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 1 1 8 0v3",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v4h-4",
  chevd: "M6 9l6 6 6-6",
  layers: "M12 3l9 5-9 5-9-5zM3 13l9 5 9-5",
  help: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17v.01",
};
export function Ic({ n, s = 20 }: { n: string; s?: number }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d={P[n] || P.grid} />
    </svg>
  );
}
