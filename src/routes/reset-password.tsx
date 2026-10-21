import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { ResetPassword } from "@/awtad/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [
    { title: "استعادة كلمة المرور | أوتاد" },
    { name: "description", content: "تعيين كلمة مرور جديدة لحسابك في أوتاد بأمان" },
    { property: "og:title", content: "استعادة كلمة المرور | أوتاد" },
    { property: "og:description", content: "تعيين كلمة مرور جديدة لحسابك في أوتاد بأمان" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: () => <ClientOnly><ResetPassword /></ClientOnly>,
});