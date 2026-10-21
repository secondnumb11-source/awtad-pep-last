import { useParams } from "@/awtad/nav";
import { useAuth } from "@/awtad/lib/auth";
import { MODULES, canOpen } from "@/awtad/components/registry";

// ملاحظة: اسم المقطع [sec] يجب أن يطابق اسمه في صفحات الموقع (site)/[sec]/[id] وإلا يرفض Next.js التشغيل.
export function ModulePage() {
  const { sec } = useParams<{ sec: string }>();
  const { user } = useAuth();
  const mod = MODULES.find((x) => x.key === sec);
  if (!mod) return <div className="card">الصفحة غير موجودة.</div>;
  if (!canOpen(mod, user?.role || "", user?.moduleAccess)) return <div className="card mut">هذه الصفحة غير متاحة لصلاحيتك.</div>;
  return <>{mod.el()}</>;
}
