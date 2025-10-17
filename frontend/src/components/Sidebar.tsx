import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";

type SvgProps = React.SVGProps<SVGSVGElement>;
type LinkState = { isActive: boolean };

function IconHome(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}
function IconBot(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
      <rect x="4" y="8" width="16" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v1" />
      <circle cx="9" cy="13" r="1.5" />
      <circle cx="15" cy="13" r="1.5" />
    </svg>
  );
}
function IconLogin(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
      <path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2" />
      <path d="M15 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}
function IconReport(p: SvgProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...p}>
      <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M15 3v5h5" />
      <path d="M8 13h8M8 17h8M8 9h4" />
    </svg>
  );
}

function BadgeNovo() {
  return <span className="badgeNovo">NOVO</span>;
}

export default function Sidebar({ hideRail = false }: { hideRail?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // breakpoint ≤768
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");

    const apply = () => {
      const mobile = mql.matches;
      setIsMobile(mobile);

      if (hideRail) {
        // sem trilho: mantém drawer sempre visível e não trava scroll
        setCollapsed(false);
        document.body.style.overflow = "";
      } else {
        setCollapsed(mobile); // com trilho: mobile inicia fechado
        document.body.style.overflow = mobile && !collapsed ? "hidden" : "";
      }
    };

    apply();
    mql.addEventListener("change", apply);
    return () => {
      mql.removeEventListener("change", apply);
      document.body.style.overflow = "";
    };
  }, [collapsed, hideRail]);

  const linkClass = ({ isActive }: LinkState) => "navlink" + (isActive ? " active" : "");
  const railClass = ({ isActive }: LinkState) => "railBtn" + (isActive ? " active" : "");

  return (
    <aside className={`sidebar ${collapsed ? "is-collapsed" : ""} ${hideRail ? "no-rail" : ""}`}>
      {/* Trilho azul – só renderiza quando NÃO está oculto */}
      {!hideRail && (
        <div className="rail">
          <button
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            className="hamburger"
            onClick={() => setCollapsed((c) => !c)}
          >
            <span /><span /><span />
          </button>

          <div className="railItems">
            <NavLink to="/dashboard" className={railClass} title="Início" end>
              <IconHome className="ico" />
            </NavLink>
            <NavLink to="/assistente" className={railClass} title="Assistente">
              <IconBot className="ico" />
            </NavLink>
            <NavLink to="/relatorios" className={railClass} title="Relatórios">
              <IconReport className="ico" />
              <BadgeNovo />
            </NavLink>
            <NavLink to="/login" className={railClass} title="Login">
              <IconLogin className="ico" />
            </NavLink>
          </div>
        </div>
      )}

      {/* Drawer (menu branco) */}
      <div className="drawer">
        <div className="brand" title="dtc-insights">dtc-insights</div>

        <nav className="menu">
          <NavLink to="/dashboard" className={linkClass} end>
            <IconHome className="ico" /><span>Início</span>
          </NavLink>
          <NavLink to="/assistente" className={linkClass}>
            <IconBot className="ico" /><span>Assistente</span>
          </NavLink>
          <NavLink to="/relatorios" className={linkClass}>
            <IconReport className="ico" /><span>Relatórios</span><BadgeNovo />
          </NavLink>
          <NavLink to="/login" className={linkClass}>
            <IconLogin className="ico" /><span>Login</span>
          </NavLink>
        </nav>

        <footer className="sidebarFooter">v1.0</footer>
      </div>

      {/* Backdrop só existe quando há trilho aberto no mobile */}
      {!hideRail && isMobile && !collapsed && (
        <button className="backdrop" aria-label="Fechar menu" onClick={() => setCollapsed(true)} />
      )}
    </aside>
  );
}
