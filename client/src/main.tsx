import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const _originalFetch = window.fetch.bind(window);
window.fetch = function(input: RequestInfo | URL, init: RequestInit = {}) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  if (url.startsWith('/api')) {
    const token = localStorage.getItem('c3d_auth_token');
    if (token) {
      const headers = new Headers((init.headers as HeadersInit) || {});
      if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
      return _originalFetch(input, { ...init, headers });
    }
  }
  return _originalFetch(input, init);
};

createRoot(document.getElementById("root")!).render(<App />);
