import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/awtad/pages/SiteLayout";
import { SitePage } from "@/awtad/pages/SitePage";
import { CO, KN, PR, SO } from "@/awtad/lib/site-data";

export const Route = createFileRoute("/$sec/$id")({
  head: ({ params }) => {
    const entries = params.sec === "p" ? PR : params.sec === "s" ? SO : params.sec === "k" ? KN : CO;
    const entry = entries.find((item) => item[0] === params.id);
    const title = `${entry?.[1] || "أقسام النظام"} | أوتاد الفهد`;
    const description = `نظام أوتاد الفهد الداخلي — ${entry?.[1] || "إدارة الموارد البشرية والمالية"}`;
    return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    };
  },
  component: Page,
});

function Page() {
  const { sec, id } = Route.useParams();
  return <SiteLayout><SitePage sec={sec} id={id} /></SiteLayout>;
}
