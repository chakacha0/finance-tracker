import "../../style/TransactionList.css";
import { useEffect, useRef, useState } from "react";
import {
  fetchTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
} from "../../api";
import TransactionStats from "./TransactionStats";
import UndoToast from "./UndoToast";
import Notice from "./Notice";
import useDebounce from "../../hooks/useDebounce";
import TransactionForm from "./TransactionForm";

export default function TransactionList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("date-desc");
  const [deleted, setDeleted] = useState(null);
  const [notice, setNotice] = useState(null);

  const showNotice = (text) => setNotice({ id: Date.now(), text });

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [searching, setSearching] = useState(false);
  const firstLoadDone = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = () => {
    setError("");
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setSearching(true);
      try {
        const data = await fetchTransactions({
          search: debouncedSearch,
          signal: controller.signal,
        });
        setItems(data);
        setError("");
        firstLoadDone.current = true;
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!firstLoadDone.current) {
          setError(err.message);
        } else {
          showNotice(`Не удалось выполнить поиск: ${err.message}`);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
          setLoading(false);
        }
      }
    };
    load();
    return () => controller.abort();
  }, [debouncedSearch, reloadKey]);

  const editing = items.find((t) => t.id === editingId) || null;

  const handleSave = async (data) => {
    if (editing === null) {
      const tempId = Date.now();
      setItems((prev) => [{ ...data, id: tempId, pending: true }, ...prev]);
      try {
        const saved = await addTransaction(data);
        setItems((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
      } catch (err) {
        setItems((prev) => prev.filter((t) => t.id !== tempId));
        showNotice(`Не удалось добавить: ${err.message}`);
      }
    } else {
      const id = editingId;
      const previous = editing;
      setEditingId(null);
      setItems((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...data, pending: true } : t)),
      );
      try {
        const saved = await updateTransaction(id, data);
        setItems((prev) => prev.map((t) => (t.id === id ? saved : t)));
      } catch (err) {
        setItems((prev) => prev.map((t) => (t.id === id ? previous : t)));
        showNotice(`Не удалось сохранить изменения: ${err.message}`);
      }
    }
  };

  const startEdit = (t) => setEditingId(t.id);

  const handleDelete = async (id) => {
    const index = items.findIndex((t) => t.id === id);
    const item = items[index];
    setItems((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
    try {
      await deleteTransaction(id);
      setDeleted({ item, index });
    } catch (err) {
      setItems((prev) => {
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, item);
        return next;
      });
      showNotice(`Не удалось удалить: ${err.message}`);
    }
  };

  const handleUndo = async () => {
    const { item, index } = deleted;
    setDeleted(null);
    const { id, pending, ...data } = item;
    const tempId = Date.now();
    setItems((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, {
        ...data,
        id: tempId,
        pending: true,
      });
      return next;
    });
    try {
      const saved = await addTransaction(data);
      setItems((prev) => prev.map((t) => (t.id === tempId ? saved : t)));
    } catch (err) {
      setItems((prev) => prev.filter((t) => t.id !== tempId));
      showNotice(`Не удалось восстановить: ${err.message}`);
    }
  };

  const visible = items
    .filter((t) => filter === "all" || t.type === filter)
    .sort((a, b) => {
      if (sort === "date-desc") return b.date.localeCompare(a.date);
      if (sort === "date-asc") return a.date.localeCompare(b.date);
      if (sort === "amount-desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });

  if (loading) {
    return (
      <div className="tx">
        <div className="tx-state" role="status">
          <div className="tx-spinner" />
          <p>Загружаем операции…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tx">
        <div className="tx-state" role="alert">
          <p className="tx-state-error">{error}</p>
          <button className="tx-btn" onClick={retry}>
            Повторить
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx">
      <header className="tx-head">
        <h1 className="tx-brand">
          <img src="/logo-mark.svg" alt="" />
          Моя монетка
        </h1>
        <span>{items.length} операций</span>
      </header>

      <TransactionStats items={items} />

      <div className="tx-layout">
        <TransactionForm
          editing={editing}
          onSubmit={handleSave}
          onCancel={() => setEditingId(null)}
        />

        <section className="tx-main">
          <div className="tx-search">
            <input
              type="search"
              placeholder="Поиск по описанию и категории"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Поиск"
            />
            {(searching || search !== debouncedSearch) && (
              <span className="tx-search-status">Ищем…</span>
            )}
          </div>

          <div className="tx-bar">
            <div className="tx-tabs">
              {[
                ["all", "Все"],
                ["income", "Доходы"],
                ["expense", "Расходы"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? "on" : ""}
                  onClick={() => setFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date-desc">Сначала новые</option>
              <option value="date-asc">Сначала старые</option>
              <option value="amount-desc">Сумма: по убыванию</option>
              <option value="amount-asc">Сумма: по возрастанию</option>
            </select>
          </div>

          {visible.length === 0 ? (
            <p className="tx-empty">
              {debouncedSearch
                ? `По запросу «${debouncedSearch}» ничего не найдено.`
                : "Ничего нет. Добавьте операцию в форме слева."}
            </p>
          ) : (
            <ul className="tx-list">
              {visible.map((t) => (
                <li
                  key={t.id}
                  className={`${editingId === t.id ? "editing" : ""} ${t.pending ? "pending" : ""}`}
                >
                  <div className={`tx-dot ${t.type}`}>
                    {(t.category || t.description || "?")[0]}
                  </div>
                  <div className="tx-info">
                    <b>{t.description || t.category || "Без названия"}</b>
                    <small>
                      {t.category || "Без категории"} ·{" "}
                      {new Date(t.date).toLocaleDateString("ru-RU")}
                    </small>
                  </div>
                  <div className={`tx-sum ${t.type}`}>
                    {t.type === "income" ? "+" : "−"}
                    {t.amount.toFixed(2)} BYN
                  </div>
                  <button
                    className="tx-icon"
                    onClick={() => startEdit(t)}
                    disabled={t.pending}
                    title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                    className="tx-icon del"
                    onClick={() => handleDelete(t.id)}
                    disabled={t.pending}
                    title="Удалить"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {notice && (
        <Notice
          key={notice.id}
          message={notice.text}
          onClose={() => setNotice(null)}
        />
      )}

      {deleted && (
        <UndoToast
          key={deleted.item.id}
          message="Операция удалена"
          onUndo={handleUndo}
          onClose={() => setDeleted(null)}
        />
      )}
    </div>
  );
}
