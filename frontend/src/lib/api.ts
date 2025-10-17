// frontend/src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Vite reescreve para http://localhost:8000
});

export default api;
