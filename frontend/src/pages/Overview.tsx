import { Link } from "react-router-dom";

const cards = [
  {
    to: "/assistente",
    title: "Assistente Inteligente",
    description: "Converse com o assistente IA para tirar dúvidas e obter insights imediatos.",
    accent: "from-sky-400 via-blue-500 to-indigo-500",
  },
  {
    to: "/relatorios",
    title: "Relatórios Dinâmicos",
    description: "Acompanhe indicadores, exporte dados e gere análises personalizadas.",
    accent: "from-emerald-400 via-lime-400 to-amber-400",
  },
  {
    to: "/assistente",
    title: "Contexto de Veículos",
    description: "Utilize placas, chassi ou IMEI para enriquecer suas conversas e buscas.",
    accent: "from-fuchsia-500 via-rose-500 to-orange-500",
  },
];

export default function Overview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-64 w-64 rounded-full bg-sky-400/40 blur-3xl" aria-hidden />
        <div className="absolute top-1/2 right-0 h-72 w-72 -translate-y-1/2 rounded-full bg-emerald-300/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-indigo-400/30 blur-3xl" aria-hidden />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-lg backdrop-blur">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white">
          Bem-vindo(a)
        </span>
        <h1 className="mt-6 text-4xl font-semibold text-slate-900 sm:text-5xl">Visão Geral</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Aqui você encontra os principais atalhos para navegar pela plataforma DTC Insights. Explore as ferramentas
          disponíveis e acelere suas análises com uma experiência guiada e intuitiva.
        </p>
      </section>

      <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <Link
            key={card.title}
            to={card.to}
            className="group relative overflow-hidden rounded-3xl border border-white/70 bg-white/80 p-6 shadow-lg transition-transform hover:-translate-y-1 hover:shadow-xl"
          >
            <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${card.accent} opacity-80 blur-2xl transition-transform group-hover:scale-110`} aria-hidden />
            <div className="relative flex h-full flex-col">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900/90 text-white shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-6 w-6"
                >
                  <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

              <h2 className="mt-6 text-2xl font-semibold text-slate-900">{card.title}</h2>
              <p className="mt-3 text-base text-slate-600">{card.description}</p>

              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-slate-900/80 transition-colors group-hover:text-slate-900">
                Acessar
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}