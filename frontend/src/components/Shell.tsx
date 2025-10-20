import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import api from "../lib/api";
import { useSessionStore } from "../store/useSession";
import logo from "../assets/logo-gobrax.png";

export default function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useSessionStore();

    // rotas onde o sidebar deve sumir
  const hideRailOn = new Set<string>(["/", "/assistente"]);
  const hideRail = hideRailOn.has(location.pathname);

   const titles: Record<string, string> = {
    "/": "Página inicial",
    "/visao-geral": "Visão geral",
    "/assistente": "Assistente IA",
    "/relatorios": "Relatórios",
  };

  const title = titles[location.pathname] ?? "dtc-insights";

  function logout() {
    setUser(null);
    setToken(null);
    navigate("/login");
  }

  useEffect(() => {
    api.get("/health").then(r => console.log("health:", r.data)).catch(console.error);
  }, []);

  return (
<div className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className="h-[72px] border-b border-slate-200 bg-white/95 px-6 shadow-sm">
        <div className="flex h-full items-center gap-4">
          <div className="flex flex-1 justify-center">
            <img src={logo} alt="Logo Gobrax" className="h-10 object-contain" />
          </div>
          <div className="font-semibold">{title}</div>
          <button
            onClick={logout}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white transition hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="h-[calc(100vh-72px)] grid grid-cols-1 grid-rows-[auto_1fr] bg-[var(--app-bg)] lg:grid-cols-[316px_1fr] lg:grid-rows-1">
        <aside className="h-full overflow-y-auto border-r border-slate-200 bg-white">
          <Sidebar hideRail={hideRail} />
        </aside>

        <main id="app-main" className="h-full overflow-hidden bg-[var(--app-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}