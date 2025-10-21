import axios, { AxiosError } from "axios";

const rawBase = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const BASE = rawBase.replace(/\/$/, "");

export class AssistantError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AssistantError";
    this.code = code;
  }
}

const api = axios.create({
  headers: { "Content-Type": "application/json" },
});

type AskPayload = { prompt: string; plate?: string };

export async function askAssistant(payload: AskPayload) {
  const body: AskPayload = {
    ...payload,
    prompt: payload.prompt.trim(),
  };

  if (!body.prompt) {
    throw new AssistantError("Escreva uma pergunta antes de enviar.", "EMPTY_PROMPT");
  }

  try {
    const res = await api.post("/assistant/ask", body);
    const data = res.data ?? {};
    const answer = data?.answer ?? data?.message ?? data ?? "";
    const text = typeof answer === "string" ? answer.trim() : String(answer ?? "").trim();

    if (!text) {
      throw new AssistantError("Não recebi conteúdo do servidor.", "EMPTY_ANSWER");
    }

    return text;
  } catch (error) {
    if (error instanceof AssistantError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const detail =
        axiosError.response?.data?.detail ??
        axiosError.response?.data?.message ??
        axiosError.response?.data?.error;
      const message =
        typeof detail === "string" && detail.trim()
          ? detail.trim()
          : "Não foi possível consultar o assistente no momento.";
      const code = status ? `HTTP_${status}` : "NETWORK_ERROR";
      throw new AssistantError(message, code);
    }

    throw new AssistantError("Não foi possível consultar o assistente no momento.");
  }
}

export default api;
