import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type OptionSelectProps<TValue extends string> = {
  value: TValue;
  options: readonly TValue[];
  onChange: (value: TValue) => void;
  className?: string;
};

export function OptionSelect<TValue extends string>({
  value,
  options,
  onChange,
  className,
}: OptionSelectProps<TValue>) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as TValue)}
      className={cn(
        "h-9 rounded-md border border-transparent bg-input px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/40",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

export function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted")}
      type="button"
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", checked ? "left-[1.375rem]" : "left-0.5")} />
    </button>
  );
}

type ActionRowProps = {
  title: string;
  hint?: string;
  action: ReactNode;
  inline?: boolean;
};

export function ActionRow({ title, hint, action, inline }: ActionRowProps) {
  if (inline) {
    return (
      <div className="flex items-center justify-between rounded-md border border-border/60 bg-input/40 px-3 py-2">
        <span className="text-sm">{title}</span>
        {action}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div>
        <div className="font-medium">{title}</div>
        {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
      </div>
      {action}
    </div>
  );
}
