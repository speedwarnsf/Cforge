import { ReactNode } from "react";

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function H2({ children, className = "" }: TypographyProps) {
  return <h2 className={`text-lg font-semibold text-slate-800 ${className}`}>{children}</h2>;
}

export function BodyText({ children, className = "" }: TypographyProps) {
  return <p className={`text-sm text-slate-600 ${className}`}>{children}</p>;
}

export function Caption({ children, className = "" }: TypographyProps) {
  return <span className={`text-xs text-slate-500 ${className}`}>{children}</span>;
}