import { useEffect } from "react";
import "../../style/Notice.css";

// Уведомление об ошибке. Само закрывается через `delay` мс.
// Ставь key, чтобы таймер перезапускался при новом сообщении.
export default function Notice({ message, onClose, delay = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, delay);
    return () => clearTimeout(timer);
    // таймер запускается один раз на показ сообщения
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="notice" role="alert">
      <span>{message}</span>
      <button onClick={onClose} aria-label="Закрыть">
        ✕
      </button>
    </div>
  );
}