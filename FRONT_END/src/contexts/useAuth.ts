import { useContext } from "react";
import { AuthContext } from "./auth-context.ts";

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth phải nằm trong AuthProvider");
  return value;
}
