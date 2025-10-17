import { FormEvent, useEffect, useRef, useState } from "react";
import api from "../lib/api";

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
  const [input, setInput] = useState("");
  const [entity, setEntity] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages(m => [...m, { id: crypto.randomUUID(), role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
    const { data } = await api.post("/chat", {
   message: text,
   vehicle_key: entity || undefined,
   });
    const answer = data?.reply ?? "Sem resposta no momento.";
      setMessages(m => [...m, { id: crypto.randomUUID(), role: "assistant", content: answer }]);
    } catch (err) {
      setMessages(m => [...m, { id: crypto.randomUUID(), role: "assistant", content: "Ops! Não consegui responder agora." }]);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="assistente-wrap">
      <div className="chat-card">
        <div className="chat-header">
          <div className="chat-title">Assistente DTC</div>
        </div>

        <div ref={listRef} className="chat-list">
          {messages.map(m => (
            <div key={m.id} className={`chat-msg ${m.role}`}>
              <div className="avatar" aria-hidden />
              <div className="bubble">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg assistant">
              <div className="avatar" aria-hidden />
              <div className="bubble">pensando…</div>
            </div>
          )}
        </div>

        <form className="composer" onSubmit={onSubmit}>
          <label htmlFor="prompt" className="sr-only">Pergunte algo</label>
          <input
            id="prompt"
            className="gbx-input flex-1"
            placeholder="Pergunte algo…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
          />

          <label htmlFor="entity" className="sr-only">Placa / IMEI / Chassi</label>
          <input
            id="entity"
            className="gbx-input w-48"
            placeholder="Placa / Chassi"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            autoComplete="off"
          />

          <button className="gbx-btn" type="submit" disabled={loading || !input.trim()}>
            {loading ? "Enviando…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}