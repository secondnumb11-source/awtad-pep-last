// @ts-nocheck -- ported from original project (looser TS settings)
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { sb, T } from "./supabase";
import { useAuth } from "./auth";
import { Row, Settings, DEFAULT_SET, today } from "./calc";

export const TABLES = ["ess_requests", "employees", "attendance", "leaves", "expenses", "candidates", "org_units", "onboarding_tasks", "goals", "reviews", "courses", "trainings", "surveys", "survey_responses", "petty_cash", "petty_spend", "trips", "salary_bands", "journal_entries", "documents", "shifts", "shift_assign", "locations", "groups", "group_members", "announcements", "notifications", "requests", "holidays", "loans", "letters", "integrations", "integration_logs", "verifications", "audit", "delegations", "comp_ledger", "field_reports", "lists", "approval_rules", "profiles", "expense_policies", "leave_policies", "seasons", "entities", "contracts", "assets", "disciplinary", "exit_tasks", "leave_adjustments", "jobs", "review_cycles", "learning_paths", "path_courses", "saved_reports", "company_profile", "company_docs", "deadlines", "fees"];

type Ctx = {
  d: Record<string, Row[]>; set: Settings; err: Record<string, string>; loading: boolean;
  reload: () => Promise<void>; emp: (id: any) => string; saveSet: (s: Settings) => Promise<void>; company: Row | null; logoUrl: string;
};
const C = createContext<Ctx>(null as any);
export const useData = () => useContext(C);

// التحميل لا يرمي أخطاء أبدًا: أي فشل يُسجَّل ويظهر في الواجهة بدل أن تتجمد الشاشة.
export function DataProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Record<string, Row[]>>({});
  const [set, setSet] = useState<Settings>(DEFAULT_SET);
  const [err, setErr] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [logoUrl, setLogoUrl] = useState("");
  const { user } = useAuth();
  const orgId = user?.orgId || "";

  const reload = useCallback(async () => {
    const nd: Record<string, Row[]> = {}, ne: Record<string, string> = {};
    await Promise.all(TABLES.map(async (t) => {
      try {
        // ملف المنشأة مفتاحه org_id؛ بقية الجداول المحمّلة لها id.
        let q = sb.from(T(t)).select("*").order(t === "company_profile" ? "org_id" : "id");
        if (t === "attendance") q = q.gte("day", today().slice(0, 7) + "-01");
        const { data, error } = await q;
        if (error) { ne[t] = error.message; nd[t] = []; } else nd[t] = data || [];
      } catch (e: any) { ne[t] = String(e?.message || e); nd[t] = []; }
    }));
    try {
      const { data, error } = await sb.from(T("organizations")).select("settings").eq("id", orgId).maybeSingle();
      if (error) ne["organizations"] = error.message; else if (data?.settings) setSet({ ...DEFAULT_SET, ...data.settings });
    } catch (e: any) { ne["organizations"] = String(e?.message || e); }
    setD(nd); setErr(ne); setLoading(false);
    try { const lp = nd.company_profile?.[0]?.logo_path; if (lp) { const { data: su } = await sb.storage.from("awtad-docs").createSignedUrl(lp, 3600); setLogoUrl(su?.signedUrl || ""); } else setLogoUrl(""); } catch {}
  }, [orgId]);

  useEffect(() => { if (orgId) reload(); }, [reload, orgId]);
  const emp = (id: any) => (d.employees || []).find((x) => x.id == id)?.name ?? "—";
  const saveSet = async (s: Settings) => {
    setSet(s);
    await sb.from(T("organizations")).update({ settings: s }).eq("id", orgId);
  };
  return <C.Provider value={{ d, set, err, loading, reload, emp, saveSet, company: d.company_profile?.[0] || null, logoUrl }}>{children}</C.Provider>;
}
