import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import TransactionList from "./components/layout/TransactionList.jsx";

createRoot(document.getElementById("root")).render(
  <TransactionList></TransactionList>,
);
