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
    to: "/historico",
    title: "Histórico de eventos",
    highlights: [
      "Filtros avançados por chassi, cliente, DTC e período",
      "Acompanhe tendências diárias e totais por intervalo",
      "Exporte os resultados filtrados para CSV",
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
    cta: "Abrir histórico",
  },
];

export default function Overview() {
  return (
    <div className="flex h-full min-h-full w-full flex-1 items-center justify-center bg-slate-100">
      <div className="flex w-full max-w-[1820px] flex-col items-center px-8 text-center">
        <section className="w-full space-y-6 mt-20">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            DTC’s Insights
          </h1>
          <p className="mx-auto text-base text-slate-600 md:text-lg">
            Explore análises inteligentes, acompanhe indicadores e mergulhe nos dados dos veículos com poucos cliques.
          </p>
        </section>

        <section className="mt-48 w-full">
          <div className="grid w-full gap-10 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {cards.map((card) => (
              <article
                key={card.title}
                className="flex h-full w-full flex-col items-center gap-8 rounded-3xl bg-white p-10 text-center shadow-md ring-1 ring-slate-200 transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <header className="flex flex-col items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#FFD31C]/80 text-2xl text-slate-900">
                    {card.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                </header>

                <ul className="w-full space-y-4 text-sm text-slate-600">
                  {card.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-left">
                      <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full bg-[#FFD31C]" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex w-full justify-center">
                  <NavLink
                    to={card.to}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD31C] px-8 py-3 text-base font-semibold text-slate-900 transition hover:brightness-95 sm:w-auto"
                  >
                    {card.cta}
                  </NavLink>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}