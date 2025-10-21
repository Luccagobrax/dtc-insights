import { FormEvent, useEffect, useRef, useState } from "react";
import { AssistantError, askAssistant } from "../lib/api";

type Msg = { id: string; role: "user" | "assistant"; content: string };

export default function Assistente() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Oi! Eu sou o Assistente DTC. Faça uma pergunta e, se quiser, informe Placa/IMEI/Chassi ao lado para contexto.",
    },
  ]);
  const [msg, setMsg] = useState("");
  const [plate, setPlate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const addMessage = (message: Omit<Msg, "id">) => {
    setMessages((prev) => [...prev, { ...message, id: crypto.randomUUID() }]);
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = msg.trim();
    if (!prompt || loading) {
      return;
    }

    addMessage({ role: "user", content: prompt });
    setMsg("");
    setError(null);
    setLoading(true);

    try {
      const answer = await askAssistant({ prompt, plate: plate || undefined });
      addMessage({ role: "assistant", content: answer });
    } catch (err) {
      console.error(err);
      if (err instanceof AssistantError) {
        setError(err.message);
      } else if (err instanceof Error && err.message === "EMPTY_ANSWER") {
        setError("Não recebi conteúdo do servidor.");
      } else {
        setError("Falha ao consultar o assistente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="assistente-wrap">
      <div className="chat-surface">
        <header className="chat-header">
          <div className="chat-title">Assistente DTC</div>
        </header>

        <div ref={listRef} className="chat-body">
          {messages.map((message) => (
            <div key={message.id} className={`chat-msg ${message.role}`}>
              <div className="avatar" aria-hidden />
              <div className="bubble">{message.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg assistant">
              <div className="avatar" aria-hidden />
              <div className="bubble">pensando…</div>
            </div>
          )}
        </div>

        <form className="chat-composer" onSubmit={handleSubmit}>
          <label htmlFor="prompt" className="sr-only">
            Pergunte algo
          </label>
          <input
            id="prompt"
            className="gbx-input flex-1"
            placeholder="Pergunte algo…"
            value={msg}
            onChange={(event) => setMsg(event.target.value)}
            autoComplete="off"
          />

          <label htmlFor="plate" className="sr-only">
            Placa / IMEI / Chassi
          </label>
          <input
            id="plate"
            className="gbx-input w-48"
            placeholder="Placa / Chassi"
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            autoComplete="off"
          />

          <button className="gbx-btn" type="submit" disabled={loading || !msg.trim()}>
            {loading ? "Enviando…" : "Enviar"}
          </button>
          {error && (
            <p className="basis-full pt-1 text-sm text-red-600">{error}</p>
          )}
        </form>
      </div>
    </section>
  );
}