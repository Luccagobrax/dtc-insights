import { Link } from "react-router-dom";

const cards = [
    {
    to: "/visao-geral",
    title: "Visão geral de DTCs",
    description:
      "Acompanhe rapidamente os eventos mais recentes, filtre por cliente ou chassi e visualize tudo no mapa.",
    highlights: [
      "Filtros por chassi, cliente, código e data",
      "Lista com contagem de DTCs por veículo",
      "Mapa interativo com a localização das ocorrências",
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
        <path d="M3 3h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 3h7v7h-7z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 14h7v7H3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m17.5 14.5 3.5 6.5-6.5-3.5L11 21l3.5-6.5 3-3z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/assistente",
    title: "Assistente Inteligente",
    description: "Converse com o assistente IA para tirar dúvidas e obter insights imediatos.",
    highlights: [
      "Faça perguntas sobre algum cliente ou veículo",
      "Envie contexto adicional para refinar as respostas",
      "Receba insights valiosos em poucos cliques",
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
        <path
          d="M20 12c0 3.314-2.91 6-6.5 6-1.362 0-2.633-.384-3.675-1.04L6 19l.832-3.328C6.298 14.64 6 13.85 6 13c0-3.314 2.91-6 6.5-6S20 8.686 20 12Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M8 5.5a4 4 0 0 1 7.874-.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
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
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-white">
          Bem-vindo(a)
        </span>
        <h1 className="mt-6 text-4xl font-semibold text-slate-900 sm:text-6xl">DTC's insights</h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Aqui você encontra os principais atalhos para navegar pela plataforma DTC Insights. Explore as ferramentas
          disponíveis e acelere suas análises com uma experiência guiada e intuitiva.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/visao-geral"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Abrir Visão geral de DTCs
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
          </Link>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => (
          <Link
            key={card.title}
            to={card.to}
            className="group flex min-h-[320px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-20 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex flex-col gap-6">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-md">
                {card.icon}
              </span>

              <div className="space-y-9">
                <h2 className="text-2xl font-semibold text-slate-900">{card.title}</h2>
                <p className="text-base text-slate-600">{card.description}</p>
                <ul className="space-y-2 text-sm text-slate-600">
                  {card.highlights.map(item => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900/80 transition-colors group-hover:text-slate-900">
              Acessar
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-8 w-8"
              >
                <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m12 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}