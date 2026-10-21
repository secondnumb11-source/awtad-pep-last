// @ts-nocheck -- ported from original project (looser TS settings)
import { ReactNode, useState } from "react";

// تبويبات: يفتح كل تبويب شرحًا تفصيليًا لمحتواه
export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [on, setOn] = useState(tabs[0].id);
  return (
    <div>
      <div className="tabs" role="tablist">{tabs.map((t) => <button key={t.id} role="tab" aria-selected={on === t.id} className={on === t.id ? "on" : ""} onClick={() => setOn(t.id)}>{t.label}</button>)}</div>
      <div className="tabpanel">{tabs.find((t) => t.id === on)?.content}</div>
    </div>
  );
}
