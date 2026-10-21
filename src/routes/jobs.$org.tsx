import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/awtad/pages/SiteLayout";
import { Jobs } from "@/awtad/pages/Jobs";

export const Route = createFileRoute("/jobs/$org")({
  head: () => ({
    meta: [
      { title: "الوظائف المتاحة | أوتاد" },
      { name: "description", content: "تصفح الوظائف الشاغرة وقدّم طلبك" },
      { property: "og:title", content: "الوظائف المتاحة | أوتاد" },
      { property: "og:description", content: "تصفح الوظائف الشاغرة وقدّم طلبك" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <SiteLayout><ClientOnly><Jobs /></ClientOnly></SiteLayout>,
});
