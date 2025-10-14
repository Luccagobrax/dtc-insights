// frontend/src/App.tsx
import { Navigate, Outlet } from 'react-router-dom';

export default function App() {
  const token = true; // substitua pelo store se já tiver
  if (!token) return <Navigate to="/login" replace />;
  return <Outlet />;
}
