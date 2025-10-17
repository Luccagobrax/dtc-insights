import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import api from "../lib/api";
import { useSessionStore } from "../store/useSession";

export default function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken } = useSessionStore();

   // rotas onde o sidebar deve sumir
  const hideRailOn = new Set<string>(["/", "/assistente"]);
  const hideRail = hideRailOn.has(location.pathname);

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
        <header className="border-b border-slate-300/60 px-6 py-3 flex items-center justify-between">
          <div className="font-semibold">Visão Geral</div>
          <button
            onClick={logout}
            className="rounded-md bg-slate-900 text-white px-3 py-2 text-sm hover:opacity-90 transition"
          >
            Sair
          </button>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
