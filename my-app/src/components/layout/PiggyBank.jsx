import { useEffect, useId, useRef, useState } from "react";
import { io } from "socket.io-client";
import "../../style/PiggyBank.css";
import { useAuth } from "../../context/AuthContext";
import { getAccessToken, refreshTokens } from "../../api";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Пользователь берётся из авторизации, имя в копилке = часть email до @
export default function PiggyBank() {
  const { user } = useAuth();
  if (!user) return null;
  return <PiggyRoom userName={user.email.split("@")[0]} />;
}

function PiggyRoom({ userName }) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [list, setList] = useState([]);
  const [room, setRoom] = useState(null); // текущая копилка
  const [history, setHistory] = useState([]);
  const [online, setOnline] = useState([]);
  const [events, setEvents] = useState([]); // уведомления вход/выход
  const [amount, setAmount] = useState("");
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // токен берём заново при каждой попытке подключения (он обновляется)
    const socket = io(SOCKET_URL, {
      auth: (cb) => cb({ token: getAccessToken() }),
    });
    let retried = false;
    socketRef.current = socket;

    const loadList = () =>
      socket.emit("piggybank:list", (res) => res.ok && setList(res.list));

    socket.on("connect", () => {
      setConnected(true);
      loadList();
    });
    socket.on("disconnect", () => setConnected(false));

    // access-токен живёт 15 минут: если сервер отклонил сокет, обновляем и пробуем снова
    socket.on("connect", () => {
      retried = false;
    });
    socket.on("connect_error", async (err) => {
      if (err.message === "unauthorized" && !retried) {
        retried = true;
        try {
          await refreshTokens();
          socket.connect();
        } catch {
          /* сессия истекла, api.js сам разлогинит пользователя */
        }
      }
    });

    // новая копилка (создана мной или я вступил по коду); дубли отсекаем по id
    socket.on("piggybank:created", (pb) =>
      setList((prev) =>
        prev.some((p) => p.id === pb.id) ? prev : [pb, ...prev],
      ),
    );

    socket.on("balance:update", ({ current, transaction }) => {
      setRoom((r) => (r ? { ...r, current } : r));
      setHistory((h) => [...h, transaction]);
      setList((prev) =>
        prev.map((p) =>
          p.id === transaction.piggyBankId ? { ...p, current } : p,
        ),
      );
    });

    socket.on("online:update", setOnline);

    const pushEvent = (type) => (e) =>
      setEvents((prev) => [
        ...prev.slice(-19),
        { type, ...e, id: Date.now() + Math.random() },
      ]);
    socket.on("user:joined", pushEvent("joined"));
    socket.on("user:left", pushEvent("left"));

    return () => {
      socket.disconnect();
    };
  }, [userName]);

  const createPiggybank = (e) => {
    e.preventDefault();
    setError("");
    socketRef.current.emit(
      "piggybank:create",
      { name: newName, goal: newGoal },
      (res) => {
        if (!res.ok) return setError(res.error);
        setNewName("");
        setNewGoal("");
      },
    );
  };

  // вступление в чужую копилку по коду приглашения
  const joinByCode = (e) => {
    e.preventDefault();
    setError("");
    socketRef.current.emit("piggybank:join", { code: joinCode }, (res) => {
      if (!res.ok) return setError(res.error);
      setJoinCode("");
      joinRoom(res.piggybank.id); // сразу открываем копилку
    });
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* буфер недоступен, код виден на экране */
    }
  };

  const joinRoom = (id) => {
    setError("");
    socketRef.current.emit("room:join", id, (res) => {
      if (!res.ok) return setError(res.error);
      setRoom(res.piggybank);
      setHistory(res.history);
      setOnline(res.online);
      setEvents([]);
    });
  };

  const leaveRoom = () => {
    socketRef.current.emit("room:leave");
    setRoom(null);
    setHistory([]);
    setOnline([]);
  };

  const deposit = (e) => {
    e.preventDefault();
    setError("");
    socketRef.current.emit("deposit", { amount: Number(amount) }, (res) => {
      if (!res.ok) return setError(res.error);
      setAmount("");
    });
  };

  const percent = room ? Math.min(100, (room.current / room.goal) * 100) : 0;

  return (
    <div className="pb">
      <div className={`pb-status ${connected ? "on" : "off"}`}>
        {connected ? "Подключено" : "Нет соединения"}
      </div>
      {error && <div className="pb-error">{error}</div>}

      {!room ? (
        <>
          <h2>Общие копилки</h2>

          <h3>Создать копилку</h3>
          <form className="pb-form" onSubmit={createPiggybank}>
            <input
              placeholder="Название (Отпуск)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="number"
              min="1"
              placeholder="Цель, ₽"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
            />
            <button type="submit">Создать</button>
          </form>

          <h3>Войти по коду приглашения</h3>
          <form className="pb-form" onSubmit={joinByCode}>
            <input
              className="pb-code-input"
              placeholder="Например, K7M2QX"
              maxLength={8}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            />
            <button type="submit">Войти</button>
          </form>

          <h3>Мои копилки</h3>
          {list.length === 0 ? (
            <p className="pb-empty">
              У вас пока нет копилок: создайте свою или введите код приглашения
            </p>
          ) : (
            <ul className="pb-grid">
              {list.map((p) => {
                const pct = Math.min(100, (p.current / p.goal) * 100);
                return (
                  <li
                    key={p.id}
                    className="pb-card"
                    onClick={() => joinRoom(p.id)}
                  >
                    <Pig percent={pct} />
                    <div className="pb-card-name">{p.name}</div>
                    <div className="pb-card-row">
                      <span>Цель</span>
                      <b>{p.goal} ₽</b>
                    </div>
                    <div className="pb-card-row">
                      <span>Накоплено</span>
                      <b>{p.current} ₽</b>
                    </div>
                    <div className="pb-card-pct">{pct.toFixed(0)}%</div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <button className="pb-back" onClick={leaveRoom}>
            ← Назад
          </button>
          <h2>{room.name}</h2>

          <div className="pb-invite">
            Код приглашения: <span className="pb-code">{room.code}</span>
            <button type="button" className="pb-copy" onClick={copyCode}>
              {copied ? "Скопировано" : "Копировать"}
            </button>
          </div>

          <div className="pb-main">
            <Pig percent={percent} />
            <div className="pb-info">
              <div className="pb-sum">
                {room.current} <small>/ {room.goal} ₽</small>
              </div>
              <div className="pb-percent">{percent.toFixed(0)}%</div>

              <form className="pb-form" onSubmit={deposit}>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="Сумма, ₽"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <button type="submit">Внести</button>
              </form>

              <div className="pb-online">
                Онлайн ({online.length}): {online.join(", ")}
              </div>
            </div>
          </div>

          <div className="pb-cols">
            <div>
              <h3>История взносов</h3>
              <ul className="pb-history">
                {[...history].reverse().map((t) => (
                  <li key={t.id}>
                    <b>{t.userName}</b> +{t.amount} ₽
                    <small>{new Date(t.createdAt).toLocaleTimeString()}</small>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>События</h3>
              <ul className="pb-events">
                {events.map((ev) => (
                  <li key={ev.id} className={ev.type}>
                    {ev.userName}{" "}
                    {ev.type === "joined" ? "зашёл(а) в копилку" : "вышел(а)"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// SVG-свинка: тело и голова сливаются в один силуэт, уровень заливки зависит от процента
function Pig({ percent }) {
  const uid = useId().replace(/:/g, "");
  const clipId = `pig-shape-${uid}`; // уникальный id: на странице может быть несколько свинок
  const p = Math.max(0, Math.min(100, percent));
  const shift = (1 - p / 100) * 108; // тело свинки занимает y от 58 до 166

  const OUT = "#c94a74"; // контур
  const BODY = "#fbd3de"; // тело (пустая часть)
  const FILL = "#f48fb1"; // уровень накопленного
  const PART = "#f7b0c6"; // ухо, ножки, пятачок
  const DARK = "#a8325c"; // щель, ноздри
  const EYE = "#6b1d3a";

  return (
    <svg
      viewBox="0 0 240 200"
      className="pig"
      role="img"
      aria-label={`Копилка заполнена на ${Math.round(p)}%`}
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="105" cy="112" rx="80" ry="54" />
          <circle cx="178" cy="98" r="34" />
        </clipPath>
      </defs>

      {/* тень под свинкой */}
      <ellipse cx="112" cy="184" rx="80" ry="6" fill={OUT} opacity="0.15" />

      {/* хвостик, ухо и ножки: рисуем под телом */}
      <path
        d="M27 104 q-18 -2 -14 -18 q3 -9 11 -5"
        fill="none"
        stroke={OUT}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g fill={PART} stroke={OUT} strokeWidth="4" strokeLinejoin="round">
        <polygon points="158,74 166,40 192,68" />
        <rect x="46" y="146" width="20" height="32" rx="7" />
        <rect x="132" y="146" width="20" height="32" rx="7" />
      </g>

      {/* силуэт: сначала толстая обводка, потом заливка поверх, чтобы не было шва между телом и головой */}
      <g fill={OUT} stroke={OUT} strokeWidth="8" strokeLinejoin="round">
        <ellipse cx="105" cy="112" rx="80" ry="54" />
        <circle cx="178" cy="98" r="34" />
      </g>
      <g fill={BODY}>
        <ellipse cx="105" cy="112" rx="80" ry="54" />
        <circle cx="178" cy="98" r="34" />
      </g>

      {/* уровень накопленного: поднимается вместе с процентом */}
      <g clipPath={`url(#${clipId})`}>
        <rect
          className="pig-fill"
          x="0"
          y="58"
          width="240"
          height="200"
          fill={FILL}
          style={{ transform: `translateY(${shift}px)` }}
        />
      </g>

      {/* щель для монет */}
      <rect x="72" y="58" width="46" height="8" rx="4" fill={DARK} />

      {/* пятачок, ноздри, глаз */}
      <ellipse
        cx="208"
        cy="104"
        rx="17"
        ry="14"
        fill={PART}
        stroke={OUT}
        strokeWidth="4"
      />
      <circle cx="203" cy="104" r="2.6" fill={DARK} />
      <circle cx="213" cy="104" r="2.6" fill={DARK} />
      <circle cx="184" cy="88" r="5" fill={EYE} />
      <circle cx="185.8" cy="86.2" r="1.6" fill="#fff" />
    </svg>
  );
}
