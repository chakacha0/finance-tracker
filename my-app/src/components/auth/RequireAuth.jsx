import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Header from "../layout/Header";
import "../../style/Auth.css";

// Оборачивает страницы, доступные только после входа: хедер + содержимое страницы
export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="auth-loading">Загрузка…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}
