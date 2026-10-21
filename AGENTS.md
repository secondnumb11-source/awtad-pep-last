<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Awtad app code (ported from Next.js) lives in src/awtad; routes in src/routes are thin wrappers. Why: keeps original components intact.
- src/awtad/nav.tsx shims next/link and next/navigation onto TanStack Router. Why: original components import Link/useRouter.
- Database is the user's own external Supabase (client in src/awtad/lib/supabase.ts, publishable key; VITE_SUPABASE_* env overrides). Do not enable Lovable Cloud. Why: user requirement.
- Original SQL and edge functions are kept for reference in supabase-reference/. Why: they are deployed in the user's Supabase, not here.
- Password recovery uses the external auth provider and a public /reset-password callback; password updates require a recovery link/event and a revalidated user. Why: recovery must work without the dashboard gate or a current password.
- Keep the animated company logo and home introduction in separate responsive grid tracks. Why: rotation must never obscure text, including on mobile.
- Preserve authenticated RPC and RLS identity-helper access; harden authorization checks to reject missing roles rather than blanket revoking functions. Why: security corrections must not disable existing workflows.
