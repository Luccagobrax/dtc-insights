import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import api from "../lib/api";
import logo from "../assets/logo-gobrax.png";

export default function Shell() {
  const location = useLocation();

  const titles: Record<string, string> = {
    "/": "Página inicial",
    "/visao-geral": "Visão geral",
    "/assistente": "Assistente IA",
    "/relatorios": "Relatórios",
  };

  const title = titles[location.pathname] ?? "dtc-insights";
  const hasSidebar = location.pathname !== "/";

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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 text-slate-900">
      <header
        className={`relative flex h-[72px] items-center border-b border-slate-200 bg-white px-6 ${
          hasSidebar ? "justify-between" : "justify-center"
        }`}
      >
        {hasSidebar ? (
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={openSidebar}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-xl text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
              aria-label="Abrir menu"
            >
              ☰
            </button>
          </div>
        ) : null}
        <img
          src={logo}
          alt="Logo Gobrax"
          className={[
            "h-12 object-contain",
            hasSidebar ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" : "",
          ].join(" ")}
        />

        {hasSidebar ? (
          <div className="font-semibold text-slate-700">{title}</div>
        ) : null}
      </header>

      <div
        className={hasSidebar ? "grid min-h-0 flex-1" : "flex min-h-0 flex-1"}
        style={hasSidebar ? { gridTemplateColumns: "var(--sidebar-width, 260px) 1fr" } : undefined}
      >
        {hasSidebar ? <Sidebar /> : null}
        <main className="relative flex min-h-0 flex-col overflow-hidden bg-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
}