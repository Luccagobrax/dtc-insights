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
    cta: "Ir para visão geral",
  },
  {
    to: "/assistente",
    title: "Assistente Inteligente",
    highlights: [
      "Faça perguntas sobre algum cliente ou veículo",
      "Envie contexto adicional para refinar as respostas",
      "Receba insights valiosos em poucos cliques",
    ],
    icon: "🤖",
    cta: "Falar com o assistente",
  },
  {
    to: "/relatorios",
    title: "Relatórios Dinâmicos",
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
    cta: "Abrir relatórios",
  },
];

export default function Overview() {
  return (
    <div className="flex h-full flex-col overflow-auto bg-slate-100">
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">DTC’s Insights</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 md:text-lg">
          Explore análises inteligentes, acompanhe indicadores e mergulhe nos dados dos veículos com poucos cliques.
        </p>
      </section>

      <section className="mx-auto w-full max-w-screen-xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex h-full flex-col justify-between rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="space-y-4">
                <header className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[#FFD73A]/80 text-2xl text-slate-900">
                    {card.icon}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-900">{card.title}</h2>
                </header>
                <ul className="space-y-2 text-sm text-slate-600">
                  {card.highlights.map((item) => (
                    <li key={item} className="flex gap-2 text-left">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-[#FFD73A]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-center justify-start">
                <NavLink
                  to={card.to}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD73A] px-6 py-3 text-base font-semibold text-slate-900 transition hover:brightness-95 md:w-auto"
                >
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