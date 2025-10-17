import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '../store/useSession';
import logo from '../assets/logo-gobrax.png';

export function Login() {
  const navigate = useNavigate();
  const { setUser, setToken } = useSessionStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleLogin(event: FormEvent) {
    event.preventDefault();
    setUser({ name: email, email });
    setToken('fake-auth-token');
    navigate('/assistente');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#E4E4E6] text-gray-900 font-[Neometric]">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        <div className="text-center">
          {/* imagem com proporção natural */}
          <img
            src={logo}
            alt="Gobrax logo"
            className="mx-auto mb-3 w-44 h-auto object-contain"
            style={{ maxHeight: '90px' }}
          />
          <h1 className="text-2xl font-extrabold">Acesse o DTC Insights</h1>
          <p className="text-sm text-gray-600">
            Seu assistente para códigos de falhas DTC&apos;s.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleLogin}>
          <div>
            <label htmlFor="email" className="text-xs font-bold text-gray-700 block">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 mt-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/15 placeholder:text-gray-400"
              placeholder="seuemail@exemplo.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="text-xs font-bold text-gray-700 block">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 mt-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900/15"
              placeholder="********"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                id="remember_me"
                name="remember_me"
                type="checkbox"
                className="h-4 w-4 border-gray-300 rounded"
              />
              Lembrar-me
            </label>

            <button
              type="button"
              className="text-sm text-gray-600 hover:underline"
              onClick={() => alert('Fluxo de recuperação ainda não implementado')}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 font-bold text-gray-900 bg-[#FFD73A] rounded-md hover:bg-[#FFCD00] focus:outline-none focus:ring-2 focus:ring-gray-900/15 transition-all duration-200"
          >
            Entrar
          </button>

          <p className="text-center text-[11px] text-gray-500 mt-4">
            © 2020–2025 Gobrax. Todos os direitos reservados.
          </p>
        </form>
      </div>
    </div>
  );
}
