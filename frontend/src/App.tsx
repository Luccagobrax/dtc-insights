import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/Shell";
import { Login } from "./pages/Login";
import Assistente from "./pages/Assistente";
import Overview from "./pages/Overview";
import VisaoGeral from "./pages/VisaoGeral";
import Relatorios from "./pages/Relatorios";
import { useSessionStore } from "./store/useSession";

function Protected({ children }: { children: JSX.Element }) {
  const token = useSessionStore(s => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<Protected><Shell /></Protected>}>
        <Route index element={<Overview />} />
        <Route path="/visao-geral" element={<VisaoGeral />} />
        <Route path="/assistente" element={<Assistente />} />
        <Route path="/relatorios" element={<Relatorios />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
