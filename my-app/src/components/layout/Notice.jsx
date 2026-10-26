import { useEffect } from "react";
import "../../style/Notice.css";


export default function Notice({ message, onClose, delay = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, delay);
    return () => clearTimeout(timer);   
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