import { createContext } from "react";
import type { Customer } from "../types/api.ts";

export type AuthContextValue = {
  user: Customer | null;
  ready: boolean;
  setSession: (user: Customer, token: string) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
