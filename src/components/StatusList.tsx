import React from "react";

type StatusItem = {
  label: string;
  detail: string;
  status: string;
  tone?: "ok" | "warning" | "neutral";
};

type StatusListProps = {
  title: string;
  items: StatusItem[];
};

const toneStyles = {
  ok: "text-emerald-300",
  warning: "text-amber-300",
  neutral: "text-slate-300",
};

const StatusList: React.FC<StatusListProps> = ({ title, items }) => (
  <section className="space-y-3">
    <h3 className="text-sm uppercase tracking-[0.35em] text-slate-300">{title}</h3>
    <div className="space-y-2">
      {items.map((item) => (
        <article
          key={`${item.label}-${item.status}`}
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200"
        >
          <div className="flex items-center justify-between">
            <strong className="text-sm text-white">{item.label}</strong>
            <span className={`text-[0.65rem] uppercase tracking-[0.3em] ${toneStyles[item.tone ?? "neutral"]}`}>
              {item.status}
            </span>
          </div>
          <p className="text-[0.7rem] text-slate-300">{item.detail}</p>
        </article>
      ))}
    </div>
  </section>
);

export default StatusList;
