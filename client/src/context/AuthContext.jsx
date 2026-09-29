import { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("stockAdvisorToken"));
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!token) return;
    api.get("/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data.user))
      .catch(() => { localStorage.removeItem("stockAdvisorToken"); setToken(null); });
  }, [token]);

  function saveSession(data) {
    localStorage.setItem("stockAdvisorToken", data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("stockAdvisorToken");
    setToken(null); setUser(null);
  }

  return <AuthContext.Provider value={{ token, user, saveSession, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
