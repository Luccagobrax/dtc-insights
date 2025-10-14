import { create } from 'zustand'

type User = { name: string; email: string }
type SessionState = {
  token: string | null
  user: User | null
  setToken: (t: string | null) => void
  setUser: (u: User | null) => void
  clear: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null,
  user: null,
  setToken: (t) => set({ token: t }),
  setUser:  (u) => set({ user: u }),
  clear:    () => set({ token: null, user: null }),
}))
