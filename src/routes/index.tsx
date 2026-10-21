import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/awtad/pages/SiteLayout";
import { Home } from "@/awtad/pages/Home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "أوتاد الفهد | نظام الموارد البشرية الداخلي" },
      { name: "description", content: "نظام إدارة الموارد البشرية الخاص بشركة أوتاد الفهد — غير مخصص للاستخدام التجاري" },
      { property: "og:title", content: "أوتاد الفهد | نظام الموارد البشرية الداخلي" },
      { property: "og:description", content: "نظام إدارة الموارد البشرية الخاص بشركة أوتاد الفهد — غير مخصص للاستخدام التجاري" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SiteLayout><Home /></SiteLayout>,
});
