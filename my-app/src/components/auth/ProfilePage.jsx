import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import PiggyBank from "../layout/PiggyBank";
import "../../style/Auth.css";

const TABS = [
  { id: "piggy", label: "Копилки" },
  { id: "credits", label: "Кредиты" },
  { id: "info", label: "Личная информация" },
];

export default function ProfilePage() {
  const { user } = useAuth();
  // вкладка хранится в адресе (?tab=credits), поэтому переживает обновление страницы
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab = TABS.some((t) => t.id === requested) ? requested : "piggy";

  if (!user) return null;

  return (
    <div className="profile-page">
      <h1 className="profile-title">Личный кабинет</h1>

      <div className="profile-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setParams({ tab: t.id }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "piggy" && <PiggyBank />}
      {tab === "credits" && <CreditsStub />}
      {tab === "info" && <InfoTab />}
    </div>
  );
}

/* ---------- вкладка «Кредиты» (пока заглушка) ---------- */
function CreditsStub() {
  return (
    <section className="profile-stub">
      <h2>Кредиты</h2>
      <p>Этот раздел появится позже.</p>
    </section>
  );
}

/* ---------- вкладка «Личная информация» ---------- */
function InfoTab() {
  const { user, logout, removeAccount } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const registered = new Date(user.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const onDelete = async () => {
    setBusy(true);
    setError("");
    try {
      // после удаления user станет null и RequireAuth отправит на /login
      await removeAccount();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="profile-grid">
      <section className="profile-card">
        <div className="profile-avatar">
          {user.email.charAt(0).toUpperCase()}
        </div>
        <div className="profile-label">Email</div>
        <div className="profile-value">{user.email}</div>

        <div className="profile-label">Дата регистрации</div>
        <div className="profile-value">{registered}</div>

        <div className="profile-label">ID пользователя</div>
        <div className="profile-value">#{user.id}</div>
      </section>

      <section className="profile-card profile-actions">
        <h2>Управление аккаунтом</h2>

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-violet" onClick={logout}>
          Выйти из аккаунта
        </button>

        {!confirming ? (
          <button className="btn-danger" onClick={() => setConfirming(true)}>
            Удалить аккаунт
          </button>
        ) : (
          <div className="profile-confirm">
            <p>Аккаунт будет удалён без возможности восстановления.</p>
            <div className="profile-confirm-row">
              <button className="btn-danger" onClick={onDelete} disabled={busy}>
                {busy ? "Удаляю…" : "Да, удалить"}
              </button>
              <button
                className="btn-ghost"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}