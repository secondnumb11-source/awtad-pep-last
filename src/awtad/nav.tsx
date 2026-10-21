// @ts-nocheck -- ported from original project (looser TS settings)
// Small compatibility layer so the original components keep their Link/router calls.
import { Link as TLink, useLocation, useNavigate, useParams as useTParams } from "@tanstack/react-router";
import type { AnchorHTMLAttributes, ReactNode } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode };
export function Link({ href, children, ...rest }: LinkProps) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TLink to={href as any} {...(rest as any)}>
      {children}
    </TLink>
  );
}

export function useRouter() {
  const nav = useNavigate();
  return {
    push: (to: string) => nav({ to }),
    replace: (to: string) => nav({ to, replace: true }),
    back: () => window.history.back(),
  };
}

export function usePathname() {
  return useLocation().pathname;
}

export function useParams<T>() {
  return useTParams({ strict: false }) as T;
}

export function notFound() {
  return <div className="card" style={{ margin: 40 }}>الصفحة غير موجودة.</div>;
}
