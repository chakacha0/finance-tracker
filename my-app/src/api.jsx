import axios from "axios";

// Адрес сервера берётся из .env: VITE_API_URL=http://localhost:3000
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  timeout: 10000, // 10 секунд, потом запрос считается неудачным
});

// Перед каждым запросом подставляем JWT-токен (если он есть)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Обработка ошибок в одном месте: превращаем их в Error с понятным текстом,
// чтобы компонент мог просто показать error.message
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // отменённый запрос (AbortController) - не ошибка, пропускаем как есть
    if (axios.isCancel(error)) return Promise.reject(error);

    // сервер не ответил: выключен, нет сети, превышено время ожидания
    if (!error.response) {
      return Promise.reject(new Error("Сервер недоступен. Проверьте подключение."));
    }

    const { status, data } = error.response;
    // если сервер прислал своё сообщение - берём его
    const serverMessage = data?.message || data?.error;

    if (status === 401) {
      localStorage.removeItem("token"); // токен просрочен или неверный
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

// Sequelize отдаёт DECIMAL строкой ("12.50") - приводим сумму к числу,
// чтобы работали .toFixed(), сортировка и подсчёт статистики
const normalize = (t) => ({
  ...t,
  amount: Number(t.amount),
  description: t.description ?? "",
  category: t.category ?? "",
});

// Сервер может вернуть сам объект или обернуть его, например { transaction: {...} }
const unwrapOne = (data) => normalize(data?.transaction ?? data);

// search - строка поиска (уходит на сервер как ?search=...)
// signal - сигнал AbortController для отмены запроса
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
  return unwrapOne(data); // здесь уже настоящий id от сервера
};

export const updateTransaction = async (id, updated) => {
  const { data } = await api.put(`/transactions/${id}`, updated);
  return unwrapOne(data);
};

export const deleteTransaction = async (id) => {
  await api.delete(`/transactions/${id}`);
};

export default api;