import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ACCESS_KEY = "token";
const REFRESH_KEY = "refreshToken";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

/* ---------- токены ---------- */

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);

export const saveTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

// Сообщаем приложению, что сессия закончилась (AuthContext на это подписан)
const forceLogout = () => {
  clearTokens();
  window.dispatchEvent(new Event("auth:logout"));
};

// Обновление токенов. Если несколько запросов одновременно получили 401,
// refresh выполнится только один раз.
let refreshPromise = null;

export const refreshTokens = () => {
  if (refreshPromise) return refreshPromise;

  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) {
    forceLogout();
    return Promise.reject(new Error("Требуется авторизация."));
  }

  // чистый axios, чтобы не попасть в собственные interceptors
  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10000 })
    .then(({ data }) => {
      saveTokens(data);
      return data.accessToken;
    })
    .catch(() => {
      forceLogout();
      throw new Error("Сессия истекла. Войдите снова.");
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

/* ---------- interceptors ---------- */

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const makeError = (message, status, details) => {
  const err = new Error(message);
  err.status = status;
  if (details) err.details = details;
  return err;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    if (!error.response) {
      return Promise.reject(
        new Error("Сервер недоступен. Проверьте подключение."),
      );
    }

    const { status, data } = error.response;
    const serverMessage = data?.message || data?.error;
    const original = error.config;

    // /auth/* (кроме logout) — ошибки входа/регистрации, токены не трогаем
    const isAuthRoute =
      original?.url?.startsWith("/auth/") && original.url !== "/auth/logout";

    if (status === 401 && !isAuthRoute && original && !original._retry) {
      original._retry = true;
      try {
        const newToken = await refreshTokens();
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    if (status === 401) {
      return Promise.reject(
        makeError(serverMessage || "Требуется авторизация.", status),
      );
    }
    if (status === 404) {
      return Promise.reject(
        makeError(serverMessage || "Запись не найдена.", status),
      );
    }
    if (status >= 500) {
      return Promise.reject(
        makeError(serverMessage || "Ошибка сервера. Попробуйте позже.", status),
      );
    }
    return Promise.reject(
      makeError(
        serverMessage || `Ошибка запроса (${status}).`,
        status,
        data?.details,
      ),
    );
  },
);

/* ---------- авторизация и профиль ---------- */

export const registerUser = async (email, password) => {
  const { data } = await api.post("/auth/register", { email, password });
  return data;
};

export const loginUser = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  saveTokens(data);
  return data;
};

export const logoutUser = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // даже если сервер недоступен, локально всё равно выходим
  } finally {
    clearTokens();
  }
};

export const fetchProfile = async () => {
  const { data } = await api.get("/profile");
  return data;
};

export const deleteProfile = async () => {
  await api.delete("/profile");
  clearTokens();
};

/* ---------- транзакции ---------- */

const normalize = (t) => ({
  ...t,
  amount: Number(t.amount),
  description: t.description ?? "",
  category: t.category ?? "",
});

const unwrapOne = (data) => normalize(data?.transaction ?? data);

export const fetchTransactions = async ({ search = "", signal } = {}) => {
  const query = search.trim();
  const { data } = await api.get("/transactions", {
    params: query ? { search: query } : {},
    signal,
  });
  const list = Array.isArray(data) ? data : (data.transactions ?? data.rows);
  if (!Array.isArray(list)) {
    throw new Error("Сервер вернул неожиданный ответ. Проверьте адрес API.");
  }
  return list.map(normalize);
};

export const addTransaction = async (transaction) => {
  const { data } = await api.post("/transactions", transaction);
  return unwrapOne(data);
};

export const updateTransaction = async (id, updated) => {
  const { data } = await api.put(`/transactions/${id}`, updated);
  return unwrapOne(data);
};

export const deleteTransaction = async (id) => {
  await api.delete(`/transactions/${id}`);
};

export default api;
