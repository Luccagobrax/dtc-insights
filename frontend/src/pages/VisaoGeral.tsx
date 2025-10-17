import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import api from "../lib/api";

declare global {
  interface Window {
    L?: any;
  }
}

const BRAZIL_CENTER: [number, number] = [-14.235004, -51.92528];
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
          mapRef.current = L.map(mapContainerRef.current).setView(BRAZIL_CENTER, 4);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>",
          }).addTo(mapRef.current);
        }

        if (!markersLayerRef.current) {
          markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }

        markersLayerRef.current.clearLayers();

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
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 });
      })
      .catch((err) => {
        console.error("Falha ao carregar o mapa", err);
        setMapError("Não foi possível carregar o mapa no momento.");
      });

    return () => {
      isMounted = false;
    };
  }, [eventsWithCoords]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">Visão geral de DTCs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Explore os eventos recentes utilizando os filtros abaixo. Clique em um item da lista para ver os DTCs detalhados e
          visualize no mapa a localização das ocorrências.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
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
      </section>

      <section className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Eventos recentes</h2>
            {loading && <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Carregando...</span>}
          </div>

          {items.length === 0 && !loading && (
            <p className="text-sm text-slate-500">Nenhum evento encontrado para os filtros informados.</p>
          )}

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
        </div>

        <div className="min-h-[520px] rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between px-2">
            <h2 className="text-lg font-semibold text-slate-900">Mapa de ocorrências</h2>
            <span className="text-xs font-medium text-slate-500">{eventsWithCoords.length} pontos mapeados</span>
          </div>
          <div className="relative h-[480px] w-full overflow-hidden rounded-2xl">
            <div ref={mapContainerRef} className="absolute inset-0" />
            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-red-600">
                {mapError}
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{selectedItem.customer_name}</h3>
                <p className="text-sm text-slate-600">Chassi: {selectedItem.chassi_last8 || "-"}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                <span className="sr-only">Fechar</span>
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Código</th>
                    <th className="py-2 pr-3">Descrição</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItem.events.map((event, index) => (
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
          </div>
        </div>
      )}
    </div>
  );
}