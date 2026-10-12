import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl px-6 text-lg font-bold " +
  "transition active:scale-95 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500 " +
  "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

const variants: Record<Variant, string> = {
  primary: "bg-sky-600 text-white shadow-md hover:bg-sky-700",
  secondary: "bg-amber-400 text-slate-900 shadow-md hover:bg-amber-500",
  ghost: "border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export function Button({ variant = "primary", className = "", ...rest }: Props) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}

export function LinkButton({
  href, variant = "primary", className = "", children,
}: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </Link>
  );
}
