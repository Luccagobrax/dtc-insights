import { NavLink } from "react-router-dom";

const cards = [
  {
    to: "/visao-geral",
    title: "Visão geral de DTCs",
    highlights: [
      "Filtros por chassi, cliente, código e data",
      "Lista com contagem de DTCs por veículo",
      "Mapa interativo com ocorrências",
    ],
    icon: "🧭",
    cta: "Acessar →",
  },
  {
    to: "/assistente",
    title: "Assistente Inteligente",
    highlights: [
      "Faça perguntas sobre algum cliente ou veículo",
      "Envie contexto adicional para refinar as respostas",
      "Receba insights valiosos em poucos cliques",
    ],
    icon: "📊",
    cta: "Explorar →",
  },
  {
    to: "/relatorios",
    title: "Relatórios Dinâmicos",
    description: "Acompanhe indicadores, exporte dados e gere análises personalizadas.",
    highlights: [
      "Monitore KPIs operacionais em tempo real",
      "Gere comparativos por período e categoria",
      "Exporte dashboards para apresentações executivas",
    ],
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-7 w-7"
      >
        <path d="M4 20V9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 20V4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 20v-5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 20V8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Overview() {
  return (
    <div className="min-h-[calc(100vh-72px)] overflow-auto bg-slate-100">
      <section className="mx-auto max-w-screen-xl px-6 pt-10 pb-6 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">DTC’s Insights</h1>
        <p className="mx-auto mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
          Aqui você encontra os principais atalhos para navegar pela plataforma DTC Insights. Explore os recursos abaixo para
          acelerar suas análises com uma experiência guiada e intuitiva.
        </p>
      </section>

      <section className="mx-auto max-w-screen-xl px-6 pb-12">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
            >
              <header className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-lg text-indigo-700">
                  {card.icon}
                </div>
                <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
              </header>
              <ul className="mt-4 space-y-1 text-sm text-slate-600 list-disc list-inside">
                {card.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="mt-4">
                <NavLink to={card.to} className="inline-flex items-center gap-2 text-indigo-700 hover:underline">
                  {card.cta}
                </NavLink>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}