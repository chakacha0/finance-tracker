import { useEffect } from "react";
import "../../style/UndoToast.css";

export default function UndoToast({ message, onUndo, onClose, delay = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, delay);
    return () => clearTimeout(timer);
  }, [onClose, delay]);

  return (
    <div className="toast" role="status">
      <span>{message}</span>
      <button onClick={onUndo}>Отменить</button>
    </div>
  );
}
