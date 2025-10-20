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
    <div className="min-h-screen flex bg-[var(--app-bg)] text-[var(--app-fg)]">
      <Sidebar hideRail={hideRail} />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center gap-4 border-b border-slate-200 bg-white/95 px-6 py-3 shadow-sm backdrop-blur">
          <div className="flex-1 flex justify-center">
            <img src={logo} alt="Logo Gobrax" className="h-10 object-contain" />
          </div>
          <div className="font-semibold">{title}</div>
          <button
            onClick={logout}
            className="rounded-md bg-slate-800 text-white px-3 py-2 text-sm hover:opacity-90 transition"
          >
            Sair
          </button>
        </header>

        <main className="flex flex-1 flex-col overflow-hidden bg-[var(--app-bg)] p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}