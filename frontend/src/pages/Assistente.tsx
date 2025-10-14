// frontend/src/pages/Assistente.tsx
import { useState } from 'react';
import api from '../lib/api';

export default function Assistente() {
  const [msg, setMsg] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!msg.trim()) return;
    setLoading(true);
    setReply('');
    try {
      const { data } = await api.post('/chat', {
        message: msg,
        vehicle_key: vehicle || null,
        hours: 24,
        minutes: 60,
      });
      setReply(data?.reply ?? '(sem resposta)');
    } catch (e) {
      console.error(e);
      setReply('Erro ao consultar o assistente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-semibold">Assistente DTC</h1>

      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="col-span-2 bg-slate-800 border border-slate-700 rounded p-3"
          placeholder="Pergunte algo…"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <input
          className="bg-slate-800 border border-slate-700 rounded p-3"
          placeholder="Placa / IMEI / Chassi(8) (opcional)"
          value={vehicle}
          onChange={(e) => setVehicle(e.target.value)}
        />
      </div>

      <button
        onClick={send}
        disabled={loading}
        className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? 'Consultando…' : 'Enviar'}
      </button>

      {reply && (
        <div className="whitespace-pre-wrap bg-slate-800/60 border border-slate-700 rounded p-4">
          {reply}
        </div>
      )}
    </div>
  );
}
