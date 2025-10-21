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
    api
      .get("/health")
      .then((response) => console.log("health:", response.data))
      .catch(console.error);
  }, []);

    const openSidebar = () => {
    window.dispatchEvent(new Event("sidebar-open"));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--app-bg)] text-[var(--app-fg)]">
      <header className="relative z-30 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
        <button
          type="button"
          onClick={openSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-xl text-slate-600 transition hover:border-slate-300 hover:text-slate-900 lg:hidden"
          aria-label="Abrir menu"
        >
          ☰
        </button>

        <div className="flex flex-1 items-center justify-center">
          <img src={logo} alt="Logo Gobrax" className="h-10 object-contain" />
        </div>

        <div className="flex items-center gap-4">
          <div className="font-semibold text-slate-700">{title}</div>
          <button
            onClick={logout}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm text-white transition hover:opacity-90"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="h-[calc(100vh-72px)] grid grid-cols-1 bg-[var(--app-bg)] lg:grid-cols-[var(--sidebar-width,260px)_1fr]">
        <Sidebar />
        <main id="app-main" className="h-full overflow-hidden bg-[var(--app-bg)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}