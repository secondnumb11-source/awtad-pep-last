import { useState } from "react";

// نموذج قابل للنسخ
export function CopyBox({ name, body }: { name: string; body: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="fcard">
      <b>{name}</b>
      <pre className="tpl">{body}</pre>
      <button className="sbtn o" onClick={async () => { try { await navigator.clipboard.writeText(body); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} }}>{ok ? "تم النسخ ✓" : "نسخ النموذج"}</button>
    </div>
  );
}
