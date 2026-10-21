import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/awtad/pages/AppLayout";
import { ModulePage } from "@/awtad/pages/ModulePage";

export const Route = createFileRoute("/$sec/")({
  head: () => ({
    meta: [
      { title: "لوحة أوتاد" },
      { name: "description", content: "إدارة الموارد البشرية والرواتب والحضور في أوتاد" },
      { property: "og:title", content: "لوحة أوتاد" },
      { property: "og:description", content: "إدارة الموارد البشرية والرواتب والحضور في أوتاد" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={<div className="card" style={{ margin: 40 }}>جارٍ التحميل...</div>}>
      <AppLayout><ModulePage /></AppLayout>
    </ClientOnly>
  ),
});
