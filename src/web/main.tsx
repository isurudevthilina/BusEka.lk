import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { Splash } from "./components/Splash";
import "./index.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  return (
    <>
      {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
