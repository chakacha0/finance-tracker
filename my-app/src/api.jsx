import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);

    if (!error.response) {
      return Promise.reject(new Error("Сервер недоступен. Проверьте подключение."));
    }

    const { status, data } = error.response;
    const serverMessage = data?.message || data?.error;

    if (status === 401) {
      localStorage.removeItem("token"); 
      return Promise.reject(new Error(serverMessage || "Требуется авторизация."));
    }
    if (status === 404) {
      return Promise.reject(new Error(serverMessage || "Запись не найдена."));
    }
    if (status >= 500) {
      return Promise.reject(new Error(serverMessage || "Ошибка сервера. Попробуйте позже."));
    }
    return Promise.reject(new Error(serverMessage || `Ошибка запроса (${status}).`));
  },
);


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