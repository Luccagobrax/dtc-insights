// frontend/src/components/Shell.tsx
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import api from '../lib/api';

export default function Shell() {
  const navigate = useNavigate();

  function logout() {
    // se tiver store de sessão, limpe aqui
    navigate('/login');
  }

  useEffect(() => {
    // só pra confirmar que o back responde
    api.get('/health').then(r => console.log('health:', r.data))
                      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="font-semibold">dtc-insights</div>
        <nav className="flex items-center gap-6">
          <Link to="/assistente" className="hover:underline">Assistente</Link>
          <button
            onClick={logout}
            className="px-3 py-1 rounded bg-slate-700 hover:bg-slate-600"
          >
            Sair
          </button>
        </nav>
      </header>

      {/* AQUI as rotas filhas renderizam */}
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
