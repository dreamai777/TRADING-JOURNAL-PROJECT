"use client";
import clsx from "clsx";
import { X } from "lucide-react";
import { useEffect } from "react";
import { formatMoney } from "@/core/currency";
import { useStore } from "@/lib/store";

export const cn = clsx;

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, right, icon }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-ink">
          {icon}
          {title}
        </div>
        {subtitle && <div className="mt-0.5 text-xs text-muted">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function Button({ variant = "primary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-accent text-accent-ink hover:brightness-110 shadow-[0_0_0_1px_rgba(200,245,59,.4),0_8px_24px_-8px_rgba(200,245,59,.5)]",
        variant === "ghost" && "text-muted hover:text-ink hover:bg-surface-2",
        variant === "outline" && "border border-line-strong text-ink hover:bg-surface-2",
        variant === "danger" && "bg-loss/15 text-loss border border-loss/30 hover:bg-loss/25",
        className,
      )}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink placeholder:text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-faint outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/15", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("h-10 w-full rounded-lg border border-line bg-surface-2 px-3 text-sm text-ink outline-none focus:border-accent/60", className)} {...rest}>
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.08em] text-muted">
      <span>{children}</span>
      {hint && <span className="normal-case tracking-normal text-faint">{hint}</span>}
    </div>
  );
}

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "profit" | "loss" | "gold" | "violet" | "accent" | "cyan"; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "bg-surface-3 text-muted",
        tone === "profit" && "bg-profit/12 text-profit",
        tone === "loss" && "bg-loss/12 text-loss",
        tone === "gold" && "bg-gold/12 text-gold",
        tone === "violet" && "bg-violet/12 text-violet",
        tone === "accent" && "bg-accent/12 text-accent",
        tone === "cyan" && "bg-cyan/12 text-cyan",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Money({ usd, sign, compact, className, colored = true }: { usd: number; sign?: boolean; compact?: boolean; className?: string; colored?: boolean }) {
  const ccy = useStore((s) => s.currency);
  return <span className={cn("num", colored && (usd > 0 ? "text-profit" : usd < 0 ? "text-loss" : "text-muted"), className)}>{formatMoney(usd, ccy, { sign, compact })}</span>;
}

export function useMoney() {
  const ccy = useStore((s) => s.currency);
  return (usd: number, o?: { sign?: boolean; compact?: boolean }) => formatMoney(usd, ccy, o);
}

export function Progress({ value, color = "var(--accent)", className, height = 6 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={cn("w-full overflow-hidden rounded-full bg-surface-3", className)} style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, boxShadow: `0 0 12px ${color}` }} />
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className={cn("card max-h-[92vh] w-full overflow-y-auto rounded-b-none border-line-strong shadow-2xl sm:rounded-2xl", wide ? "sm:max-w-5xl" : "sm:max-w-xl")}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-3.5 backdrop-blur">
          <div className="font-display text-base font-semibold">{title}</div>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-3 hover:text-ink" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-line bg-surface-2 p-0.5", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer", value === o.value ? "bg-surface-3 text-ink shadow-sm" : "text-muted hover:text-ink")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "profit" | "loss"; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[.08em] text-muted">
        {label}
        <span className="text-faint">{icon}</span>
      </div>
      <div className={cn("num mt-2 text-2xl font-semibold", tone === "profit" && "text-profit", tone === "loss" && "text-loss")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </Card>
  );
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <div className="font-display text-lg font-semibold">{title}</div>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const fmtPct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
export const fmtNum = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "∞");
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const fmtPrice = (v: number) => (v >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : v >= 10 ? v.toFixed(2) : v.toFixed(5));
