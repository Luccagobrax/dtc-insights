import { FormEvent, useEffect, useMemo, useState } from "react";

import api from "../lib/api";

const PAGE_SIZE = 25;
const DEFAULT_RANGE_DAYS = 7;

type Filters = {
  chassi: string;
  customer: string;
  dtc: string;
  startDate: string;
  endDate: string;
};

type DailyPoint = {
  date: string;
  count: number;
  breakdown?: Array<{ dtc: string; count: number }>;
};

type HistoryEvent = {
  timestamp: string | null;
  customer_name: string | null;
  chassi: string | null;
  chassi_last8: string | null;
  plate: string | null;
  dtc: string | null;
  dtc_description: string | null;
  status: string | null;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type DailyResponse = {
  start_date?: string;
  end_date?: string;
  points: Array<{
    event_date?: string;
    date?: string;
    total_count?: number;
    count?: number;
    breakdown?: Array<{ dtc: string; count: number }>;
  }>;
};

type EventsResponse = {
  items: HistoryEvent[];
  pagination: Pagination;
  range?: { start_date?: string; end_date?: string };
};

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function differenceInDays(start: Date, end: Date) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / msPerDay);
}

function createDefaultFilters(): Filters {
  const today = new Date();
  const end = formatInputDate(today);
  const startDate = addDays(today, -(DEFAULT_RANGE_DAYS - 1));
  return {
    chassi: "",
    customer: "",
    dtc: "",
    startDate: formatInputDate(startDate),
    endDate: end,
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildSeries(points: DailyPoint[], rangeStart: string | undefined, rangeEnd: string | undefined) {
  if (!rangeStart || !rangeEnd) {
    return points;
  }

  const start = parseInputDate(rangeStart);
  const end = parseInputDate(rangeEnd);
  if (!start || !end || end < start) {
    return points;
  }

  const normalized = new Map(points.map((point) => [point.date, point]));
  const days = differenceInDays(start, end);
  const series: DailyPoint[] = [];
  for (let index = 0; index <= days; index += 1) {
    const current = addDays(start, index);
    const key = formatInputDate(current);
    const existing = normalized.get(key);
    series.push(existing ?? { date: key, count: 0, breakdown: [] });
  }
  return series;
}

function computePreviousRange(filters: Filters): { startDate: string; endDate: string } | null {
  const start = parseInputDate(filters.startDate);
  const end = parseInputDate(filters.endDate);
  if (!start || !end) {
    return null;
  }
  if (end < start) {
    return null;
  }
  const days = Math.max(0, differenceInDays(start, end));
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -days);
  return {
    startDate: formatInputDate(previousStart),
    endDate: formatInputDate(previousEnd),
  };
}

function downloadCSV(rows: HistoryEvent[]) {
  if (rows.length === 0) return;
  const header = [
    "Data/hora do evento",
    "Cliente",
    "Veículo",
    "Chassi (últimos 8)",
    "DTC",
    "Descrição",
    "Status",
  ];
  const lines = rows.map((row) => {
    const date = formatDateTime(row.timestamp);
    const vehicle = formatVehicleLabel(row);
    const safe = (value: string | null | undefined) => (value ?? "").replace(/"/g, '""');
    return [date, row.customer_name ?? "", vehicle, row.chassi_last8 ?? "", row.dtc ?? "", row.dtc_description ?? "", row.status ?? ""]
      .map((value) => `"${safe(value)}"`)
      .join(";");
  });
  const csvContent = [header.join(";"), ...lines].join("\n");
  const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `historico-dtc-${new Date().toISOString()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatVehicleLabel(row: HistoryEvent) {
  if (row.plate && row.chassi) {
    return `${row.plate} • ${row.chassi}`;
  }
  if (row.plate) {
    return row.plate;
  }
  if (row.chassi) {
    return row.chassi;
  }
  return "-";
}

const KPI_CARD_BASE_CLASSES =
  "flex h-[320px] flex-none min-h-0 flex-col justify-between rounded-3xl border bg-white p-6 shadow-sm md:h-[400px] lg:h-[480px] xl:h-[480px]";

function TrendKPI({
  currentTotal,
  previousTotal,
  loading,
  error,
}: {
  currentTotal: number;
  previousTotal: number;
  loading: boolean;
  error: string | null;
}) {
  const diff = currentTotal - previousTotal;
  const percent = previousTotal === 0 ? (currentTotal > 0 ? 100 : 0) : (diff / previousTotal) * 100;
  const direction = percent > 0 ? "up" : percent < 0 ? "down" : "flat";

  if (loading) {
    return (
      <div className={`${KPI_CARD_BASE_CLASSES} border-red-200`}>
        <div className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-slate-200" />
        </div>
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${KPI_CARD_BASE_CLASSES} border-red-200`}>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Tendência de eventos</h2>
          <p className="mt-2 text-sm text-red-600">{error}</p>
        </div>
        <p className="text-xs text-slate-500">Tente aplicar os filtros novamente.</p>
      </div>
    );
  }

  const formattedTotal = new Intl.NumberFormat("pt-BR").format(currentTotal);
  const formattedPercent = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(percent));

  const trendLabel = direction === "up" ? "↑" : direction === "down" ? "↓" : "→";
  const trendColor = direction === "up" ? "text-emerald-600" : direction === "down" ? "text-red-600" : "text-slate-500";

  return (
    <div className={`${KPI_CARD_BASE_CLASSES} border-slate-200`}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">Tendência de eventos</h2>
        <p className="mt-6 text-4xl font-bold text-slate-900">{formattedTotal}</p>
      </div>
      <p className={`text-sm font-semibold ${trendColor}`}>
        <span aria-hidden className="mr-1">{trendLabel}</span>
        <span className="mr-1">{formattedPercent}%</span>
        <span className="font-normal text-slate-500">vs período anterior</span>
      </p>
    </div>
  );
}

const CHART_CARD_BASE_CLASSES =
  "flex h-[320px] flex-none min-h-0 min-w-0 flex-col rounded-3xl border bg-white p-6 shadow-sm md:h-[400px] lg:h-[480px] xl:h-[480px]";

function EventsChart({ data, loading, error }: { data: DailyPoint[]; loading: boolean; error: string | null }) {
  if (loading) {
    return (
      <div className={`${CHART_CARD_BASE_CLASSES} border-slate-200`}>
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-6 flex-1 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${CHART_CARD_BASE_CLASSES} border-red-200`}>
        <h2 className="text-base font-semibold text-slate-900">Eventos por dia</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className={`${CHART_CARD_BASE_CLASSES} items-center justify-center border-slate-200 text-center`}>
        <h2 className="text-base font-semibold text-slate-900">Eventos por dia</h2>
        <p className="mt-4 text-sm text-slate-500">Nenhum dado disponível para os filtros selecionados.</p>
      </div>
    );
  }

  const maxValue = data.reduce((max, point) => (point.count > max ? point.count : max), 0);
  const rawWidth = data.length * 40;
  const viewBoxWidth = Math.min(1600, Math.max(600, rawWidth));
  const viewBoxHeight = 400;
  const horizontalPadding = 24;
  const verticalPadding = 32;
  const usableWidth = viewBoxWidth - horizontalPadding * 2;
  const usableHeight = viewBoxHeight - verticalPadding * 2;
  const enableHorizontalScroll = rawWidth > 960;

  const points = data.map((point, index) => {
    const x = horizontalPadding + (data.length > 1 ? (usableWidth * index) / (data.length - 1) : usableWidth / 2);
    const valueRatio = maxValue === 0 ? 0 : point.count / maxValue;
    const y = verticalPadding + usableHeight - valueRatio * usableHeight;
    return { x, y, point };
  });

  const polylinePoints = points.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <div className={`${CHART_CARD_BASE_CLASSES} border-slate-200`}>
      <h2 className="text-base font-semibold text-slate-900">Eventos por dia</h2>
      <div className="mt-4 flex-1 min-h-0 overflow-hidden">
        <div
          className={`h-full w-full ${enableHorizontalScroll ? "overflow-x-auto" : "overflow-hidden"}`}
        >
          <div
            className="h-full"
            style={{ minWidth: enableHorizontalScroll ? `${viewBoxWidth}px` : "100%" }}
          >
                        <svg
              viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
              role="img"
              aria-label="Série temporal de eventos"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
              className="h-full w-full"
            >
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(79, 70, 229, 0.35)" />
                <stop offset="100%" stopColor="rgba(79, 70, 229, 0.05)" />
              </linearGradient>
            </defs>

            <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="white" />
            <line
              x1={horizontalPadding}
              x2={viewBoxWidth - horizontalPadding}
              y1={viewBoxHeight - verticalPadding}
              y2={viewBoxHeight - verticalPadding}
              stroke="#E2E8F0"
            />
            <polyline
              fill="none"
              stroke="#4F46E5"
              strokeWidth={3}
              points={polylinePoints}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polygon
              points={`${horizontalPadding},${viewBoxHeight - verticalPadding} ${polylinePoints} ${viewBoxWidth - horizontalPadding},${viewBoxHeight - verticalPadding}`}
              fill="url(#chartFill)"
              opacity={0.6}
            />

            {points.map(({ x, y, point }) => {
              const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(point.date));
              const breakdown = point.breakdown && point.breakdown.length
                ? `\n${point.breakdown
                    .slice(0, 4)
                    .map((item) => `${item.dtc ?? "Sem código"}: ${item.count}`)
                    .join("\n")}`
                : "";

              return (
                <g key={point.date}>
                  <circle cx={x} cy={y} r={4.5} fill="#4338CA" />
                  <title>
                    {`${label}: ${point.count} eventos${breakdown}`}
                  </title>
                </g>
              );
            })}

            {points.map(({ x, point }) => {
              const date = new Date(point.date);
              const label = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
              return (
                <text key={`${point.date}-label`} x={x} y={viewBoxHeight - verticalPadding + 18} textAnchor="middle" fontSize="12" fill="#475569">
                  {label}
                </text>
              );
            })}

            {[0, 0.5, 1].map((fraction) => {
              const value = Math.round(maxValue * fraction);
              const y = verticalPadding + usableHeight - fraction * usableHeight;
              return (
                <g key={fraction}>
                  <line x1={horizontalPadding - 6} x2={horizontalPadding} y1={y} y2={y} stroke="#CBD5F5" />
                  <text x={horizontalPadding - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#64748B">
                    {value}
                  </text>
                </g>
              );
            })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Historico() {
  const [filters, setFilters] = useState<Filters>(() => createDefaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<Filters>(() => createDefaultFilters());
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);
  const [tableData, setTableData] = useState<HistoryEvent[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 });
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentTotal, setCurrentTotal] = useState(0);
  const [previousTotal, setPreviousTotal] = useState(0);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const series = useMemo(
    () => buildSeries(dailyData, appliedFilters.startDate, appliedFilters.endDate),
    [dailyData, appliedFilters.startDate, appliedFilters.endDate],
  );

  async function fetchData(nextFilters: Filters, page: number, order: "asc" | "desc") {
    const params = {
      chassi: nextFilters.chassi || undefined,
      customer: nextFilters.customer || undefined,
      dtc: nextFilters.dtc || undefined,
      start_date: nextFilters.startDate || undefined,
      end_date: nextFilters.endDate || undefined,
    } as Record<string, string | undefined>;

    setDailyLoading(true);
    setDailyError(null);
    setTableLoading(true);
    setTableError(null);
    setKpiLoading(true);
    setKpiError(null);

    setAppliedFilters({ ...nextFilters });

    const previousRange = computePreviousRange(nextFilters);
    try {
      const dailyPromise = api
        .get<DailyResponse>("/history/daily", { params })
        .then((response) => response.data);
      const previousPromise = previousRange
        ? api
            .get<DailyResponse>("/history/daily", {
              params: {
                ...params,
                start_date: previousRange.startDate,
                end_date: previousRange.endDate,
              },
            })
            .then((response) => response.data)
        : Promise.resolve<DailyResponse>({ points: [] });
      const tablePromise = api
        .get<EventsResponse>("/history/events", {
          params: {
            ...params,
            page,
            page_size: PAGE_SIZE,
            order,
          },
        })
        .then((response) => response.data);

      const [dailyResult, previousResult, tableResult] = await Promise.allSettled([
        dailyPromise,
        previousPromise,
        tablePromise,
      ]);

      if (dailyResult.status === "fulfilled") {
        const rawPoints = dailyResult.value.points ?? [];
        const normalized = rawPoints.map((point) => ({
          date: point.event_date ?? point.date ?? "",
          count: point.total_count ?? point.count ?? 0,
          breakdown: point.breakdown ?? [],
        })).filter((item) => item.date);
        setDailyData(normalized);
        setCurrentTotal(normalized.reduce((sum, item) => sum + item.count, 0));
      } else {
        setDailyData([]);
        setCurrentTotal(0);
        setDailyError("Não foi possível carregar a série temporal.");
        setKpiError("Não foi possível calcular a variação em relação ao período anterior.");
      }

      if (previousResult.status === "fulfilled") {
        const rawPoints = previousResult.value?.points ?? [];
        const normalized = Array.isArray(rawPoints)
          ? rawPoints.map((point: any) => point.total_count ?? point.count ?? 0)
          : [];
        const total = normalized.reduce((sum: number, value: number) => sum + value, 0);
        setPreviousTotal(total);
      } else {
        setPreviousTotal(0);
        setKpiError("Não foi possível calcular a variação em relação ao período anterior.");
      }

      if (tableResult.status === "fulfilled") {
        const { items, pagination: meta } = tableResult.value;
        setTableData(items ?? []);
        setPagination(meta ?? { page, pageSize: PAGE_SIZE, totalItems: items?.length ?? 0, totalPages: 1 });
      } else {
        setTableData([]);
        setPagination({ page, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 });
        setTableError("Não foi possível carregar os eventos filtrados.");
      }
    } finally {
      setDailyLoading(false);
      setTableLoading(false);
      setKpiLoading(false);
    }
  }

  useEffect(() => {
    const initial = { ...filters };
    fetchData(initial, 1, sortDirection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...filters };
    fetchData(payload, 1, sortDirection);
  }

  function handleReset() {
    const defaults = createDefaultFilters();
    setFilters(defaults);
    fetchData({ ...defaults }, 1, "desc");
    setSortDirection("desc");
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 1 || nextPage === pagination.page || nextPage > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page: nextPage }));
    fetchData({ ...appliedFilters }, nextPage, sortDirection);
  }

  function handleToggleSort() {
    const next = sortDirection === "desc" ? "asc" : "desc";
    setSortDirection(next);
    fetchData({ ...appliedFilters }, 1, next);
  }

  const pageStart = (pagination.page - 1) * pagination.pageSize + 1;
  const pageEnd = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="flex-shrink-0 space-y-4 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Histórico de eventos DTC</h1>
          <p className="mt-2 text-sm text-slate-600">
            Explore a evolução dos eventos ao longo do tempo e acompanhe os detalhes em tabela, exportando quando necessário.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[repeat(auto-fit,minmax(220px,1fr))]"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Chassi (últimos 8 dígitos)</label>
              <input
                type="text"
                maxLength={8}
                className="mt-2 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.chassi}
                onChange={(event) => setFilters((prev) => ({ ...prev, chassi: event.target.value.toUpperCase() }))}
                placeholder="ABC12345"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Cliente</label>
              <input
                type="text"
                className="mt-2 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.customer}
                onChange={(event) => setFilters((prev) => ({ ...prev, customer: event.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">DTC (código)</label>
              <input
                type="text"
                className="mt-2 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.dtc}
                onChange={(event) => setFilters((prev) => ({ ...prev, dtc: event.target.value.toUpperCase() }))}
                placeholder="P1234"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Data inicial</label>
              <input
                type="date"
                className="mt-2 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.startDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Data final</label>
              <input
                type="date"
                className="mt-2 h-11 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.endDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
              />
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 sm:col-span-2 md:col-span-3 lg:col-span-1">
              <button
                type="submit"
                className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                aria-label="Aplicar filtros"
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                aria-label="Limpar filtros"
              >
                Limpar
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
        <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden">
          <div className="grid flex-none min-h-0 gap-6 md:grid-cols-[clamp(280px,30%,340px)_minmax(0,1fr)] lg:grid-cols-[clamp(300px,28%,360px)_minmax(0,1fr)]">
            <TrendKPI currentTotal={currentTotal} previousTotal={previousTotal} loading={kpiLoading} error={kpiError} />
            <EventsChart data={series} loading={dailyLoading} error={dailyError} />
          </div>

          <div className="flex-1 min-h-0">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Eventos detalhados</h2>
                  <p className="text-xs text-slate-500">Ordenados por data {sortDirection === "desc" ? "(mais recentes primeiro)" : "(mais antigos primeiro)"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSort}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                    aria-label="Alternar ordenação por data"
                  >
                    Ordenar {sortDirection === "desc" ? "↑" : "↓"}
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadCSV(tableData)}
                    disabled={!tableData.length}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Exportar resultados em CSV"
                  >
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden">
                <div className="h-full w-full overflow-y-auto">
                  <div className="min-w-full overflow-x-auto">
                    <table
                      className="min-w-[720px] divide-y divide-slate-200 lg:min-w-full"
                      aria-label="Tabela de eventos filtrados"
                    >
                  <thead className="bg-slate-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Data/hora do evento
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Cliente
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Veículo
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Chassi (últimos 8)
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        DTC
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Descrição
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                      >
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {tableLoading ? (
                      Array.from({ length: 6 }).map((_, index) => (
                        <tr key={`loading-${index}`} className="animate-pulse">
                          <td className="px-6 py-4">
                            <div className="h-4 w-32 rounded bg-slate-200" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-32 rounded bg-slate-200" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-24 rounded bg-slate-200" />
                          </td>
                          <td className="hidden px-6 py-4 lg:table-cell">
                            <div className="h-4 w-20 rounded bg-slate-200" />
                          </td>
                          <td className="px-6 py-4">
                            <div className="h-4 w-16 rounded bg-slate-200" />
                          </td>
                          <td className="hidden px-6 py-4 lg:table-cell">
                            <div className="h-4 w-36 rounded bg-slate-200" />
                          </td>
                          <td className="hidden px-6 py-4 lg:table-cell">
                            <div className="h-4 w-20 rounded bg-slate-200" />
                          </td>
                        </tr>
                      ))
                    ) : tableData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                          {tableError ?? "Nenhum evento encontrado para os filtros informados."}
                        </td>
                      </tr>
                    ) : (
                      tableData.map((event, index) => (
                        <tr key={`${event.timestamp ?? "sem-data"}-${index}`}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{formatDateTime(event.timestamp)}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{event.customer_name || "-"}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{formatVehicleLabel(event)}</td>
                          <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-slate-700 lg:table-cell">{event.chassi_last8 || "-"}</td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-700">{event.dtc || "-"}</td>
                          <td className="hidden px-6 py-4 text-sm text-slate-700 sm:table-cell sm:max-w-xs sm:whitespace-normal sm:leading-5">
                            {event.dtc_description || "-"}
                          </td>
                          <td className="hidden whitespace-nowrap px-6 py-4 text-sm text-slate-700 md:table-cell">{event.status || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex flex-shrink-0 items-center justify-between border-t border-slate-200 px-6 py-4">
                <div className="text-sm text-slate-500">
                  {pagination.totalItems > 0 ? (
                    <span>
                      Exibindo {pageStart}-{pageEnd} de {pagination.totalItems} eventos
                    </span>
                  ) : (
                    <span>Nenhum evento encontrado</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || tableLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Página anterior"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-slate-600">
                    Página {pagination.page} de {Math.max(1, pagination.totalPages)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages || tableLoading}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Próxima página"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}