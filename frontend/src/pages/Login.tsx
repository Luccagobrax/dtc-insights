// frontend/src/pages/Login.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // mock: em produção, chame seu /auth/login
    nav('/assistente');
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-900 text-slate-100">
      <form onSubmit={submit} className="w-[420px] rounded-xl bg-slate-800 p-6 border border-slate-700 space-y-3">
        <h2 className="text-lg font-semibold">Entrar</h2>
        <input className="w-full bg-slate-900 border border-slate-700 rounded p-3"
               placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full bg-slate-900 border border-slate-700 rounded p-3"
               placeholder="Senha" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button className="w-full rounded bg-amber-500 hover:bg-amber-600 py-2">Entrar</button>
      </form>
    </div>
  );
}
