import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSessionStore } from "../store/useSession";

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function IconBot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="4" y="8" width="16" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v1" />
      <circle cx="9" cy="13" r="1.5" />
      <circle cx="15" cy="13" r="1.5" />
    </svg>
  );
}

function IconCompass(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m14.5 9.5-1.4 4.2-4.2 1.4 1.4-4.2z" />
      <path d="M12 3v2" />
      <path d="M21 12h-2" />
      <path d="M12 19v2" />
      <path d="M5 12H3" />
    </svg>
  );
}

function IconLogin(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}

function IconReport(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M15 3v5h5" />
      <path d="M8 13h8M8 17h8M8 9h4" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/", label: "Página Inicial", icon: IconHome, end: true },
  { to: "/visao-geral", label: "Visão geral", icon: IconCompass },
  { to: "/assistente", label: "Assistente", icon: IconBot },
  { to: "/historico", label: "Histórico", icon: IconReport },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { setUser, setToken } = useSessionStore();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");

    const handleChange = () => {
      const mobile = mql.matches;
      setIsMobile(mobile);
      setCollapsed(mobile ? true : false);
    };

    handleChange();
    mql.addEventListener("change", handleChange);

    const handleOpen = () => setCollapsed(false);
    window.addEventListener("sidebar-open", handleOpen);

    return () => {
      mql.removeEventListener("change", handleChange);
      window.removeEventListener("sidebar-open", handleOpen);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = collapsed ? "" : "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [collapsed, isMobile]);

  useEffect(() => {
    const width = isMobile
      ? collapsed
        ? "0px"
        : "260px"
      : collapsed
        ? "72px"
        : "260px";
    document.documentElement.style.setProperty("--sidebar-width", width);

    return () => {
      document.documentElement.style.removeProperty("--sidebar-width");
    };
  }, [collapsed, isMobile]);

  const toggle = () => setCollapsed((value) => !value);
  const close = () => setCollapsed(true);

    const handleLoginClick = () => {
    setUser(null);
    setToken(null);
    navigate("/login");

    if (isMobile) {
      close();
    }
  };

  const asideClasses = [
    "sidebar bg-white text-slate-700",
    "flex h-full min-h-0 flex-col border-r border-slate-200",
    "shadow-sm",
    "transition-[width,transform] duration-300 ease-out",
    isMobile
      ? "fixed left-0 top-[72px] z-30 h-[calc(100vh-72px)] w-[260px] shadow-xl"
      : collapsed
        ? "w-[72px]"
        : "w-[260px]",
    isMobile && collapsed ? "-translate-x-full" : "translate-x-0",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <aside className={asideClasses}>
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={toggle}
            aria-label="Alternar menu"
            aria-expanded={!collapsed}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"
          >
            ☰
          </button>
          <div
            className={[
              "flex-1 text-left text-lg font-semibold tracking-wide text-slate-900",
              !isMobile && collapsed ? "sr-only" : "",
            ].join(" ")}
          >
            dtc-insights
          </div>
        </div>

        <nav className="mt-2 flex flex-1 flex-col gap-2 overflow-y-auto pb-6">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  "navlink mx-3 flex items-center gap-3.5 rounded-2xl px-4 py-3 font-medium transition-all",
                  !isMobile && collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-[#FFD31C] text-slate-900 shadow-sm"
                    : "text-slate-700 hover:bg-[#FFD31C] hover:text-slate-900",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              onClick={isMobile ? close : undefined}
            >
              <Icon className="ico h-6 w-6 shrink-0" />
              <span className={!isMobile && collapsed ? "sr-only" : ""}>{label}</span>
            </NavLink>
          ))}
        </nav>

                <div className="px-3 pb-4">
          <button
            type="button"
            onClick={handleLoginClick}
            className={[
              "flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 font-medium text-slate-700 transition-all hover:bg-[#FFD31C] hover:text-slate-900",
              !isMobile && collapsed ? "justify-center" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <IconLogin className="ico h-6 w-6 shrink-0" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Sair</span>
          </button>
        </div>

        <footer className="mt-auto px-4 py-4 text-center text-xs text-slate-400">v1.0</footer>
      </aside>

      {isMobile && !collapsed && (
        <button aria-label="Fechar menu" className="fixed inset-0 top-[72px] z-20 bg-black/40" onClick={close} />
      )}
    </>
  );
}
