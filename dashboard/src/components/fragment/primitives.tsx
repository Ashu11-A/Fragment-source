import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 px-6 py-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("px-6 py-6", className)}>{children}</section>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-success">{hint}</div>}
    </Card>
  );
}

export function Button({
  children, variant = "primary", size = "md", className, ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "destructive" | "success" | "outline"; size?: "sm" | "md" }) {
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "bg-transparent text-foreground hover:bg-accent",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    success: "bg-success text-success-foreground hover:bg-success/90",
    outline: "border border-border bg-transparent text-foreground hover:bg-accent",
  };
  return (
    <button
      {...props}
      className={cn("inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none", sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone = "muted", className }: { children: ReactNode; tone?: "muted" | "success" | "warning" | "destructive" | "primary"; className?: string }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
    primary: "bg-primary/15 text-primary",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "block h-9 w-full rounded-md border border-transparent bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40",
        props.className,
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "block w-full rounded-md border border-transparent bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40",
        props.className,
      )}
    />
  );
}

export function Empty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-muted-foreground">{icon}</div>}
      <div className="text-base font-semibold">{title}</div>
      {description && <div className="mt-1 max-w-md text-sm text-muted-foreground">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatusPill({ status }: { status: "online" | "offline" | "starting" | string }) {
  const tone = status === "online" ? "success" : status === "starting" ? "warning" : "muted";
  return (
    <Badge tone={tone as any}>
      <span className={cn("status-dot",
        status === "online" ? "bg-success text-success" : status === "starting" ? "bg-warning text-warning" : "bg-muted-foreground text-muted-foreground")} />
      {status[0].toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "success" | "warning" | "destructive" }) {
  const colors = { primary: "bg-primary", success: "bg-success", warning: "bg-warning", destructive: "bg-destructive" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-all", colors[tone])} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export function DialogTrigger({ children }: { children: ReactNode }) {
  return <DialogPrimitive.Trigger asChild>{children}</DialogPrimitive.Trigger>;
}

export function DialogContent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <DialogPrimitive.Content className="fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border/60 bg-card p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <DialogPrimitive.Title className="font-display text-lg font-bold">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <button type="button" className="rounded-md p-1 hover:bg-accent transition-colors">
              <X className="h-4 w-4" />
            </button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
