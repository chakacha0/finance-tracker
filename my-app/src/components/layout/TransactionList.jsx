import "../../style/TransactionList.css";
import { useEffect, useState } from "react";
import TransactionStats from "./TransactionStats";
import UndoToast from "./UndoToast";
import TransactionForm from "./TransactionForm";


const MOCK = [
  {
    id: 1,
    amount: 2400,
    type: "income",
    category: "Зарплата",
    description: "Зарплата за месяц",
    date: "2026-09-28",
  },
  {
    id: 2,
    amount: 64.9,
    type: "expense",
    category: "Продукты",
    description: "Maxima, закупка на неделю",
    date: "2026-09-30",
  },
  {
    id: 3,
    amount: 18.5,
    type: "expense",
    category: "Кафе",
    description: "Кофе и круассан",
    date: "2026-09-29",
  },
  {
    id: 4,
    amount: 780,
    type: "expense",
    category: "Жильё",
    description: "Аренда квартиры",
    date: "2026-09-26",
  },
  {
    id: 5,
    amount: 320,
    type: "income",
    category: "Фриланс",
    description: "Вёрстка лендинга",
    date: "2026-09-22",
  },
  {
    id: 6,
    amount: 42,
    type: "expense",
    category: "Транспорт",
    description: "Проездной",
    date: "2026-09-20",
  },
  {
    id: 7,
    amount: 119,
    type: "expense",
    category: "Одежда",
    description: "Кроссовки",
    date: "2026-09-18",
  },
  {
    id: 8,
    amount: 27,
    type: "expense",
    category: "Развлечения",
    description: "Кино",
    date: "2026-09-15",
  },
  {
    id: 9,
    amount: 2400,
    type: "income",
    category: "Зарплата",
    description: "Зарплата за месяц",
    date: "2026-08-28",
  },
  {
    id: 10,
    amount: 740,
    type: "expense",
    category: "Жильё",
    description: "Аренда квартиры",
    date: "2026-08-26",
  },
  {
    id: 11,
    amount: 92.4,
    type: "expense",
    category: "Продукты",
    description: "Продукты",
    date: "2026-08-20",
  },
  {
    id: 12,
    amount: 210,
    type: "income",
    category: "Фриланс",
    description: "Логотип для клиента",
    date: "2026-08-12",
  },
  {
    id: 13,
    amount: 2300,
    type: "income",
    category: "Зарплата",
    description: "Зарплата за месяц",
    date: "2026-07-28",
  },
  {
    id: 14,
    amount: 740,
    type: "expense",
    category: "Жильё",
    description: "Аренда квартиры",
    date: "2026-07-26",
  },
  {
    id: 15,
    amount: 320,
    type: "expense",
    category: "Путешествия",
    description: "Билеты на выходные",
    date: "2026-07-15",
  },
  {
    id: 16,
    amount: 2300,
    type: "income",
    category: "Зарплата",
    description: "Зарплата за месяц",
    date: "2026-06-28",
  },
  {
    id: 17,
    amount: 740,
    type: "expense",
    category: "Жильё",
    description: "Аренда квартиры",
    date: "2026-06-26",
  },
  {
    id: 18,
    amount: 101.7,
    type: "expense",
    category: "Продукты",
    description: "Продукты",
    date: "2026-06-14",
  },
];

const STORAGE_KEY = "transactions";

export default function TransactionList() {
  
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false); 
  const [editingId, setEditingId] = useState(null);  
  const [filter, setFilter] = useState("all"); 
  const [sort, setSort] = useState("date-desc");  
  const [deleted, setDeleted] = useState(null); 

  
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setItems(saved ? JSON.parse(saved) : MOCK);
    } catch {
      setItems(MOCK);
    }
    setLoaded(true);
  }, []);


  useEffect(() => {
    if (!loaded) return; 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const editing = items.find((t) => t.id === editingId) || null;

  const handleSave = (data) => {
    if (editing === null) {     
      setItems([{ ...data, id: Date.now() }, ...items]);
    } else {      
      setItems(items.map((t) => (t.id === editingId ? { ...t, ...data } : t)));
      setEditingId(null);
    }
  };

  const startEdit = (t) => setEditingId(t.id);

  const handleDelete = (id) => {
    const index = items.findIndex((t) => t.id === id);
    setDeleted({ item: items[index], index });
    setItems(items.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleUndo = () => {
    const next = [...items];
    next.splice(deleted.index, 0, deleted.item);
    setItems(next);
    setDeleted(null);
  };

  const visible = items
    .filter((t) => filter === "all" || t.type === filter)
    .sort((a, b) => {
      if (sort === "date-desc") return b.date.localeCompare(a.date);
      if (sort === "date-asc") return a.date.localeCompare(b.date);
      if (sort === "amount-desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });

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
              Ничего нет. Добавьте операцию в форме слева.
            </p>
          ) : (
            <ul className="tx-list">
              {visible.map((t) => (
                <li key={t.id} className={editingId === t.id ? "editing" : ""}>
                  <div className={`tx-dot ${t.type}`}>{t.category[0]}</div>
                  <div className="tx-info">
                    <b>{t.description || t.category}</b>
                    <small>
                      {t.category} ·{" "}
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
                    title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                    className="tx-icon del"
                    onClick={() => handleDelete(t.id)}
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
