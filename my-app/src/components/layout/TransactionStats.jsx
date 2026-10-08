import "../../style/TransactionStats.css";

const fmt = (n) =>
  n.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " BYN";
const COLORS = [
  "#c3e063",
  "#6d3fc0",
  "#b79cf0",
  "#8aa83a",
  "#3a1d73",
  "#d9c9f5",
];

// Кольцевая диаграмма: расходы по категориям (чистый SVG, без библиотек)
function ExpenseDonut({ items }) {
  const byCat = {};
  items
    .filter((t) => t.type === "expense")
    .forEach(
      (t) => (byCat[t.category] = (byCat[t.category] || 0) + Number(t.amount)),
    );

  const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((s, [, v]) => s + v, 0);
  if (rest > 0) top.push(["Другое", rest]);
  const total = top.reduce((s, [, v]) => s + v, 0);

  if (total === 0) return <p className="chart-empty">Расходов пока нет</p>;

  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" role="img" aria-label="Расходы по категориям">
        <g transform="rotate(-90 50 50)">
          {top.map(([name, value], i) => {
            const len = (value / total) * C;
            const circle = (
              <circle
                key={name}
                cx="50"
                cy="50"
                r={R}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="14"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return circle;
          })}
        </g>
        <text x="50" y="48" textAnchor="middle" className="donut-label">
          всего
        </text>
        <text x="50" y="60" textAnchor="middle" className="donut-total">
          {Math.round(total)} BYN
        </text>
      </svg>

      <ul className="legend">
        {top.map(([name, value], i) => (
          <li key={name}>
            <i style={{ background: COLORS[i % COLORS.length] }} />
            <span>{name}</span>
            <b>{Math.round((value / total) * 100)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Столбцы: доходы и расходы за последние 6 месяцев
function MonthlyBars({ items }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const list = items.filter((t) => t.date.startsWith(key));
    const sum = (type) =>
      list
        .filter((t) => t.type === type)
        .reduce((s, t) => s + Number(t.amount), 0);
    return {
      key,
      label: d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", ""),
      income: sum("income"),
      expense: sum("expense"),
    };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));

  return (
    <div>
      <div className="bars">
        {months.map((m) => (
          <div className="bars-col" key={m.key}>
            <div className="bars-pair">
              <span
                className="in"
                style={{ height: `${(m.income / max) * 100}%` }}
                title={`Доходы: ${fmt(m.income)}`}
              />
              <span
                className="out"
                style={{ height: `${(m.expense / max) * 100}%` }}
                title={`Расходы: ${fmt(m.expense)}`}
              />
            </div>
            <small>{m.label}</small>
          </div>
        ))}
      </div>
      <div className="bars-legend">
        <span>
          <i className="in" /> Доходы
        </span>
        <span>
          <i className="out" /> Расходы
        </span>
      </div>
    </div>
  );
}

// Принимает массив операций и сам считает статистику — ничего не знает про список.
export default function TransactionStats({ items }) {
  const income = items
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = items
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  return (
    <section className="stats">
      <div className="stats-card">
        <span>Операций</span>
        <strong>{items.length}</strong>
      </div>
      <div className="stats-card">
        <span>Доходы</span>
        <strong>{fmt(income)}</strong>
      </div>
      <div className="stats-card">
        <span>Расходы</span>
        <strong>{fmt(expense)}</strong>
      </div>
      <div className={`stats-card balance ${balance < 0 ? "neg" : ""}`}>
        <span>Баланс</span>
        <strong>{fmt(balance)}</strong>
      </div>

      <div className="stats-card chart">
        <h3>Расходы по категориям</h3>
        <ExpenseDonut items={items} />
      </div>
      <div className="stats-card chart">
        <h3>Последние 6 месяцев</h3>
        <MonthlyBars items={items} />
      </div>
    </section>
  );
}
