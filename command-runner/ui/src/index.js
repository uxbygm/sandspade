import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import './styles/tailwind.css';

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(<App />);
