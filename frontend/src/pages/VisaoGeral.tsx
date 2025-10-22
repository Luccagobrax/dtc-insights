import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import api from "../lib/api";

declare global {
  interface Window {
    L?: any;
  }
}

const BRAZIL_CENTER: [number, number] = [-14.235004, -51.92528];
const DEFAULT_ZOOM = 5;
const MAP_MAX_AUTO_ZOOM = 7;
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

let leafletPromise: Promise<any> | null = null;

function ensureLeaflet(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Leaflet requires a browser environment"));
  }

  if (window.L) {
    return Promise.resolve(window.L);
  }

  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(`script[src='${LEAFLET_JS}']`);
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.L));
        existingScript.addEventListener("error", (event) => reject(event));
      } else {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = LEAFLET_CSS;
        link.crossOrigin = "";
        link.setAttribute("data-leaflet", "true");
        document.head.appendChild(link);

        const script = document.createElement("script");
        script.src = LEAFLET_JS;
        script.async = true;
        script.crossOrigin = "";
        script.onload = () => resolve(window.L);
        script.onerror = (event) => reject(event);
        document.body.appendChild(script);
      }
    });
  }

  return leafletPromise;
}

type OverviewEvent = {
  dtc: string | null;
  dtc_description?: string | null;
  timestamp: string | null;
  status?: string | null;
  lat?: number | null;
  lon?: number | null;
  imei?: string | null;
};

type OverviewItem = {
  customer_name: string;
  chassi_last8: string;
  plate?: string | null;
  dtc_count: number;
  most_recent: string | null;
  events: OverviewEvent[];
};

type Filters = {
  chassi: string;
  customer: string;
  dtc: string;
  eventDate: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "-";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default function VisaoGeral() {
  const [filters, setFilters] = useState<Filters>({ chassi: "", customer: "", dtc: "", eventDate: "" });
  const [items, setItems] = useState<OverviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<OverviewItem | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  async function fetchData(currentFilters: Filters) {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/overview/dtc-events", {
        params: {
          chassi: currentFilters.chassi || undefined,
          customer: currentFilters.customer || undefined,
          dtc: currentFilters.dtc || undefined,
          event_date: currentFilters.eventDate || undefined,
        },
      });

      setItems(response.data.items ?? []);
    } catch (err) {
      console.error(err);
      setError("Não foi possível carregar os eventos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    fetchData(filters);
  }

  function handleReset() {
    const cleared: Filters = { chassi: "", customer: "", dtc: "", eventDate: "" };
    setFilters(cleared);
    fetchData(cleared);
  }

  const eventsWithCoords = useMemo(() => {
    return items
      .flatMap((item) => item.events.map((event) => ({ ...event, customer: item.customer_name, chassi: item.chassi_last8 })))
      .filter((event) => typeof event.lat === "number" && typeof event.lon === "number") as Array<
        OverviewEvent & { customer: string; chassi: string; lat: number; lon: number }
      >;
  }, [items]);

  useEffect(() => {
    let isMounted = true;

    if (!mapContainerRef.current) {
      return undefined;
    }

    ensureLeaflet()
      .then((L) => {
        if (!isMounted || !mapContainerRef.current) return;

        setMapError(null);

        if (!mapRef.current) {
          mapRef.current = L.map(mapContainerRef.current).setView(BRAZIL_CENTER, DEFAULT_ZOOM);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
          }).addTo(mapRef.current);
        }

        if (!markersLayerRef.current) {
          markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }

        markersLayerRef.current.clearLayers();
        mapRef.current.invalidateSize();

        if (eventsWithCoords.length === 0) {
          mapRef.current.setView(BRAZIL_CENTER, 4);
          return;
        }

        eventsWithCoords.forEach((event) => {
          const marker = L.marker([event.lat, event.lon]);
          const popupContent = `
            <div style="font-size: 13px; line-height: 1.4;">
              <strong>${event.dtc ?? "Sem código"}</strong><br />
              ${event.dtc_description ? `<span>${event.dtc_description}</span><br />` : ""}
              <span>${formatDate(event.timestamp)}</span><br />
              <span>Cliente: ${event.customer}</span><br />
              <span>Chassi: ${event.chassi}</span>
            </div>
          `;
          marker.bindPopup(popupContent);
          marker.addTo(markersLayerRef.current!);
        });

        const bounds = L.latLngBounds(eventsWithCoords.map((event) => [event.lat, event.lon]));
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: MAP_MAX_AUTO_ZOOM });
      })
      .catch((err) => {
        console.error("Falha ao carregar o mapa", err);
        setMapError("Não foi possível carregar o mapa no momento.");
      });

    return () => {
      isMounted = false;
    };
  }, [eventsWithCoords]);

    const mapInstance = mapRef.current;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const map = mapInstance;
    if (!map) {
      return;
    }

    const invalidate = () => map.invalidateSize();
    const timeout = window.setTimeout(invalidate, 0);

    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);

    let resizeObserver: ResizeObserver | null = null;
    const container = document.getElementById("map-container");

    if (container && "ResizeObserver" in window) {
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(container);
    }

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("resize", onResize);
      if (container && resizeObserver) {
        resizeObserver.unobserve(container);
        resizeObserver.disconnect();
      }
    };
  }, [mapInstance]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <section className="flex-shrink-0 space-y-4 p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Visão geral de DTCs</h1>
          <p className="mt-2 text-sm text-slate-600">
            Explore os eventos recentes utilizando os filtros abaixo. Clique em um item da lista para ver os DTCs detalhados e
            visualize no mapa a localização das ocorrências.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-5" onSubmit={handleSubmit}>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Chassi (últimos 8 dígitos)</label>
              <input
                type="text"
                maxLength={8}
                className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.chassi}
                onChange={(event) => setFilters((prev) => ({ ...prev, chassi: event.target.value.toUpperCase() }))}
                placeholder="ABC12345"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Cliente</label>
              <input
                type="text"
                className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.customer}
                onChange={(event) => setFilters((prev) => ({ ...prev, customer: event.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">DTC (código)</label>
              <input
                type="text"
                className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.dtc}
                onChange={(event) => setFilters((prev) => ({ ...prev, dtc: event.target.value.toUpperCase() }))}
                placeholder="P1234"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-semibold text-slate-600">Data do evento</label>
              <input
                type="date"
                className="mt-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                value={filters.eventDate}
                onChange={(event) => setFilters((prev) => ({ ...prev, eventDate: event.target.value }))}
              />
            </div>

            <div className="mt-auto flex gap-2">
              <button
                type="submit"
                className="inline-flex flex-1 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Aplicar filtros
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
              >
                Limpar
              </button>
            </div>
          </form>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>
      </section>

      <section className="flex-1 min-h-0 overflow-hidden px-6 pb-6">
        <div className="grid h-full min-h-0 grid-rows-[40vh_1fr] gap-6 lg:grid-rows-none lg:grid-cols-[380px_1fr]">
          <aside
            id="recent-events"
            className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"          >
            <div className="flex flex-1 flex-col overflow-y-auto">
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-900">Eventos recentes</h2>
                  {loading && (
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carregando...</span>
                  )}
                </div>
              </div>

              <div className="space-y-3 px-4 py-4">
                {items.length === 0 && !loading ? (
                  <p className="text-sm text-slate-500">Nenhum evento encontrado para os filtros informados.</p>
                ) : (
                  <ul className="space-y-3">
                    {items.map((item) => (
                      <li key={`${item.customer_name}-${item.chassi_last8}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:shadow"
                        >
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span className="font-semibold text-slate-900">{item.customer_name}</span>
                            <span>{item.plate ? `Placa ${item.plate}` : ""}</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-sm text-slate-600">
                            <span>Chassi • {item.chassi_last8 || "-"}</span>
                            <span>{item.dtc_count} DTC&apos;s</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">Último evento: {formatDate(item.most_recent)}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>

          <div
            id="map-wrapper"
            className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Mapa de ocorrências</h2>
                <span className="text-xs font-medium text-slate-500">{eventsWithCoords.length} pontos mapeados</span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden p-4">
              <div className="relative h-full w-full">
                <div id="map-container" ref={mapContainerRef} className="h-full w-full" />
                {mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-red-600">
                    {mapError}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedItem && (
        <EventoDetalhe item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  );
}
type EventoDetalheProps = {
  item: OverviewItem;
  onClose: () => void;
};

function EventoDetalhe({ item, onClose }: EventoDetalheProps) {
  return (
    <div className="fixed inset-0 z-[1200] flex justify-end">
      <button
        type="button"
        aria-label="Fechar detalhes do evento"
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
      />

      <aside className="relative z-40 flex h-screen w-full max-w-[720px] flex-col bg-white shadow-2xl">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white/95 px-4 py-3 shadow backdrop-blur supports-[backdrop-filter]:bg-white/70">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{item.customer_name}</h2>
            <p className="text-sm text-slate-600">Chassi: {item.chassi_last8 || "-"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500 shadow">
              <tr>
                <th className="py-2 pr-3">Data</th>
                <th className="py-2 pr-3">Código</th>
                <th className="py-2 pr-3">Descrição</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {item.events.map((event, index) => (
                <tr key={`${event.dtc}-${event.timestamp}-${index}`} className="border-t border-slate-100">
                  <td className="py-2 pr-3">{formatDate(event.timestamp)}</td>
                  <td className="py-2 pr-3 font-semibold text-slate-900">{event.dtc}</td>
                  <td className="py-2 pr-3 text-xs text-slate-600">{event.dtc_description || "-"}</td>
                  <td className="py-2 text-xs text-slate-500">{event.status || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </aside>
    </div>
  );
}