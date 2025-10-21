import axios from "axios";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const api = axios.create({
  baseURL: BASE,
});

export async function askAssistant(payload: { prompt: string; plate?: string }) {
  const res = await fetch(`${BASE}/assistant/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // response might not be JSON
  }

  const answer = data?.answer ?? data ?? "";

  if (!answer || !String(answer).trim()) {
    throw new Error("EMPTY_ANSWER");
  }

  return String(answer);
}

export default api;
