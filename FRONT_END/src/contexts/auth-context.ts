import { createContext } from "react";
import type { User } from "../types/api.ts";

export type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  acceptSession: (user: User, token: string) => void;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
