import React from "react";

export type OverviewCardProps = {
  title: string;
  value: string | React.ReactNode;
  hint?: string;
  variant?: "primary" | "secondary";
  children?: React.ReactNode;
};

const variantStyles = {
  primary: "border border-white/20",
  secondary: "border border-slate-800",
};

const OverviewCard: React.FC<OverviewCardProps> = ({ title, value, hint, variant = "primary", children }) => (
  <article className={`card-glow rounded-2xl p-4 ${variantStyles[variant]}`}>
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-wide text-slate-200">{title}</p>
      <span className="text-xs text-slate-300">{hint}</span>
    </div>
    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    {children && <div className="mt-3 text-sm text-slate-200">{children}</div>}
  </article>
);

export default OverviewCard;
