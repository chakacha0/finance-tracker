import { createContext, useContext, useEffect, useState } from "react";
import {
  clearTokens,
  deleteProfile,
  fetchProfile,
  getAccessToken,
  loginUser,
  logoutUser,
  registerUser,
} from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // при загрузке страницы пробуем восстановить сессию по сохранённым токенам
  useEffect(() => {
    let cancelled = false;

    if (!getAccessToken()) {
      setLoading(false);
      return;
    }

    fetchProfile()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // api.js сообщает, если refresh не удался
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("auth:logout", onLogout);
    return () => window.removeEventListener("auth:logout", onLogout);
  }, []);

  const login = async (email, password) => {
    await loginUser(email, password);
    const profile = await fetchProfile();
    setUser(profile);
  };

  // сервер после регистрации токены не отдаёт, поэтому сразу входим
  const register = async (email, password) => {
    await registerUser(email, password);
    await login(email, password);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const removeAccount = async () => {
    await deleteProfile();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, removeAccount }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth нужно вызывать внутри <AuthProvider>");
  return ctx;
}