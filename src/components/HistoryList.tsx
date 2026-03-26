import React from "react";

type HistoryItem = {
  label: string;
  detail: string;
  time: string;
  severity?: "info" | "warning";
};

type HistoryListProps = {
  title: string;
  items: HistoryItem[];
};

const severityColors = {
  info: "text-slate-300",
  warning: "text-amber-300",
};

const HistoryList: React.FC<HistoryListProps> = ({ title, items }) => (
  <section className="space-y-2">
    <h3 className="text-sm uppercase tracking-wider text-slate-300">{title}</h3>
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <article
          key={`${item.label}-${item.time}`}
          className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200"
        >
          <div className="flex items-center justify-between">
            <strong className="text-base text-white">{item.label}</strong>
            <span className={`text-xs ${severityColors[item.severity ?? "info"]}`}>{item.time}</span>
          </div>
          <p className="text-xs text-slate-300">{item.detail}</p>
        </article>
      ))}
    </div>
  </section>
);

export default HistoryList;
