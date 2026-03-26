import React from "react";

type NavigationProps = {
  automationEnabled: boolean;
  onToggleAutomation: (value: boolean) => void;
  mockMode: boolean;
  onToggleMock: (value: boolean) => void;
};

const navItems = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Sensori", href: "#sensori" },
  { label: "Automazioni", href: "#automazioni" },
  { label: "Telecamere", href: "#telecamere" },
];

const Navigation: React.FC<NavigationProps> = ({
  automationEnabled,
  onToggleAutomation,
  mockMode,
  onToggleMock,
}) => (
  <>
    <header className="fixed inset-x-0 top-0 z-20 bg-gradient-to-br from-emerald-950/90 via-slate-950/90 to-cyan-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <div>
        <p className="text-sm uppercase tracking-[0.4em] text-sky-200">Montagna</p>
        <h1 className="text-lg font-semibold text-white">Monitoring Hub</h1>
        <span className="mt-1 inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.3em] text-slate-200">
          {mockMode ? "Mock" : "API"}
        </span>
      </div>
      <nav className="hidden items-center gap-4 text-sm text-slate-200 md:flex">
        {navItems.map((item) => (
          <a
            key={item.href}
            className="rounded-full px-3 py-1 transition hover:bg-white/10"
            href={item.href}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-4 text-[0.65rem] text-slate-200">
        <div className="flex items-center gap-2">
          <span>Automazione</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={automationEnabled}
              onChange={(event) => onToggleAutomation(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-10 rounded-full bg-slate-600 transition peer-checked:bg-amber-400" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span>Mock</span>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={mockMode}
              onChange={(event) => onToggleMock(event.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-10 rounded-full bg-slate-600 transition peer-checked:bg-sky-400" />
            <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
          </label>
        </div>
      </div>
    </div>
  </header>
  <nav className="fixed bottom-4 left-1/2 z-30 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-xs text-slate-200 backdrop-blur md:hidden">
    {navItems.map((item) => (
      <a
        key={`mobile-${item.href}`}
        href={item.href}
        className="rounded-full px-3 py-2 transition hover:bg-white/10"
      >
        {item.label}
      </a>
    ))}
  </nav>
  </>
);

export default Navigation;
