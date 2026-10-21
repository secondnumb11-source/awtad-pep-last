import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { Login } from "@/awtad/pages/Login";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | أوتاد الفهد" },
      { name: "description", content: "سجّل الدخول إلى نظام الموارد البشرية الداخلي لشركة أوتاد الفهد" },
      { property: "og:title", content: "تسجيل الدخول | أوتاد الفهد" },
      { property: "og:description", content: "سجّل الدخول إلى نظام الموارد البشرية الداخلي لشركة أوتاد الفهد" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <ClientOnly><Login /></ClientOnly>,
});
