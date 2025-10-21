import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1024px)");

    const apply = () => {
      const mobile = mql.matches;
      setIsMobile(mobile);
      setCollapsed(mobile ? true : false);
    };

    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      
    const handleOpen = () => setCollapsed(false);
    window.addEventListener("sidebar-open", handleOpen);

      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const width = !isMobile ? (collapsed ? "72px" : "260px") : "0px";
    document.documentElement.style.setProperty("--sidebar-width", width);
  }, [collapsed, isMobile]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    return () => {
      document.documentElement.style.setProperty("--sidebar-width", "260px");
    };
  }, []);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    ["navlink", isActive ? "active" : ""].filter(Boolean).join(" ");

  const sidebarClasses = [
    "sidebar bg-white text-slate-700",
    "flex h-full min-h-0 flex-col border-r border-slate-200",
    "z-20",
    isMobile
      ? "fixed left-0 top-[72px] h-[calc(100vh-72px)] w-[260px] transform transition-transform duration-300 ease-out"
      : "transition-[width] duration-300 ease-out",
    !isMobile && collapsed ? "w-[72px]" : "",
    !isMobile && !collapsed ? "w-[260px]" : "",
    isMobile && collapsed ? "-translate-x-full" : "",
    isMobile && !collapsed ? "translate-x-0" : "",
    !isMobile && collapsed ? "collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between px-3 py-4">
          <button
            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          >
            <span className="inline-flex h-4 w-5 flex-col justify-between">
              <span className="block h-[2px] w-full rounded bg-current" />
              <span className="block h-[2px] w-full rounded bg-current" />
              <span className="block h-[2px] w-full rounded bg-current" />
            </span>
            <span className={!isMobile && collapsed ? "sr-only" : ""}>{collapsed ? "Expandir" : ""}</span>
          </button>

          <div className={!isMobile && collapsed ? "sr-only" : "font-semibold text-slate-900"}>dtc-insights</div>
        </div>

        <nav className="menu mt-1 flex-1 overflow-y-auto pb-16">
          <NavLink to="/" className={linkClass} end>
            <IconHome className="ico" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Página Inicial</span>
          </NavLink>
          <NavLink to="/visao-geral" className={linkClass}>
            <IconCompass className="ico" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Visão geral</span>
          </NavLink>
          <NavLink to="/assistente" className={linkClass}>
            <IconBot className="ico" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Assistente</span>
          </NavLink>
          <NavLink to="/relatorios" className={linkClass}>
            <IconReport className="ico" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Relatórios</span>
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            <IconLogin className="ico" />
            <span className={!isMobile && collapsed ? "sr-only" : ""}>Login</span>
          </NavLink>
        </nav>

        <footer className="sidebarFooter">v1.0</footer>
      </aside>

      {isMobile && !collapsed && (
        <button
          aria-label="Fechar menu"
          className="fixed inset-0 top-[72px] bg-black/25 transition-opacity duration-300"
          onClick={() => setCollapsed(true)}
        />
      )}
    </>
  );
}
