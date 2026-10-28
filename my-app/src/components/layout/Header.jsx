import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../style/Header.css";

// Общий хедер для всех страниц после входа: логотип слева, навигация справа
export default function Header() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <header className="app-header">
      <Link to="/" className="hdr-brand">
        <img className="hdr-logo" src="/logo-mark.svg" alt="" />
        <span className="hdr-title">Моя монетка</span>
      </Link>

      <nav className="hdr-nav">
        <NavLink to="/" end>
          Операции
        </NavLink>
        <NavLink to="/profile">{user.email.split("@")[0]}</NavLink>
        <button onClick={logout}>Выйти</button>
      </nav>
    </header>
  );
}