
  // @ts-expect-error react-dom/client is available at runtime but lacks declarations in this project.
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  // @ts-expect-error CSS is handled by the bundler and lacks TypeScript declarations.
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  