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
    "/historico": "Histórico",
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
    <div className="flex min-h-screen w-full flex-col bg-slate-100 text-slate-900">
      <header className="relative grid h-[72px] grid-cols-[auto_1fr_auto] items-center border-b border-slate-200 bg-white px-4">
  {hasSidebar ? (
    <button
      type="button"
      onClick={openSidebar}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-xl text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 lg:hidden"
      aria-label="Abrir menu"
    >
      ☰
    </button>
  ) : (
    <span />
  )}

  <div className="flex justify-center">
    <img src={logo} alt="Logo Gobrax" className="h-12 object-contain" />
  </div>

  {hasSidebar ? (
    <div className="font-semibold text-slate-700 text-right pr-2">{title}</div>
  ) : (
    <span />
  )}
</header>

      <div
        className={hasSidebar ? "grid flex-1" : "flex flex-1"}
        style={hasSidebar ? { gridTemplateColumns: "var(--sidebar-width,260px) minmax(0,1fr)" } : undefined}
>
        {hasSidebar ? <Sidebar /> : null}
        <main
          className="relative flex h-[calc(100vh-72px)] min-h-0 flex-1 flex-col overflow-hidden bg-slate-100"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}