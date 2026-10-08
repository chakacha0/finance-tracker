import { useEffect, useState } from "react";
import "../../style/TransactionForm.css";

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  amount: "",
  type: "expense",
  category: "",
  description: "",
  date: today(),
});

export default function TransactionForm({ editing, onSubmit, onCancel }) {
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      editing
        ? {
            amount: String(editing.amount),
            type: editing.type,
            category: editing.category,
            description: editing.description,
            date: editing.date,
          }
        : emptyForm(),
    );
    setError("");
  }, [editing]);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = Number(String(form.amount).replace(",", "."));
    if (!amount || amount <= 0) return setError("Введите сумму больше нуля");

    onSubmit({
      ...form,
      amount,
      category: form.category.trim() || "Без категории",
    });
    setForm(emptyForm());
    setError("");
  };

  return (
    <form className="tx-form" onSubmit={handleSubmit}>
      <h2>{editing ? "Редактирование" : "Новая операция"}</h2>

      <div className="tx-switch">
        {[
          ["expense", "Расход"],
          ["income", "Доход"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={form.type === value ? `on ${value}` : ""}
            onClick={() => setForm({ ...form, type: value })}
          >
            {label}
          </button>
        ))}
      </div>

      <label>
        Сумма
        <input
          type="number"
          name="amount"
          placeholder="0.00"
          value={form.amount}
          onChange={onChange}
        />
      </label>
      <label>
        Категория
        <input
          name="category"
          placeholder="Продукты"
          value={form.category}
          onChange={onChange}
        />
      </label>
      <label>
        Описание
        <input
          name="description"
          placeholder="На что потрачено"
          value={form.description}
          onChange={onChange}
        />
      </label>
      <label>
        Дата
        <input name="date" type="date" value={form.date} onChange={onChange} />
      </label>

      {error && <p className="tx-error">{error}</p>}

      <button type="submit" className="tx-btn">
        {editing ? "Сохранить" : "Добавить"}
      </button>
      {editing && (
        <button type="button" className="tx-btn ghost" onClick={onCancel}>
          Отмена
        </button>
      )}
    </form>
  );
}
