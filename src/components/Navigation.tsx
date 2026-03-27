import React from "react";

type NavigationProps = {
  automationEnabled: boolean;
  onToggleAutomation: (value: boolean) => void;
};

const Navigation: React.FC<NavigationProps> = ({
  automationEnabled,
  onToggleAutomation,
}) => (
  <>
    <header className="forest-header fixed inset-x-0 top-0 z-20 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.45em] text-emerald-200">Rainforest Ops</p>
          <h1 className="text-xl font-semibold text-white">Montagna Control Hub</h1>
          <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-emerald-100">
            API live
          </span>
        </div>
        <div className="flex items-center gap-3 text-[0.65rem] text-slate-200">
          <span className="uppercase tracking-[0.25em] text-slate-300">Automazione</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={automationEnabled}
              onChange={(event) => onToggleAutomation(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-10 rounded-full bg-slate-600 transition peer-checked:bg-emerald-400" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </label>
        </div>
      </div>
    </header>
  </>
);

export default Navigation;
