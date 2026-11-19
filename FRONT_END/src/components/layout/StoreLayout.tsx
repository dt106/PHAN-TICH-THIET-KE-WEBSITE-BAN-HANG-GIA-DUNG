import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "../../styles/store.css";
import { CartDrawer } from "./CartDrawer.tsx";
import { Footer } from "./Footer.tsx";
import { Header } from "./Header.tsx";
import { CustomerChatWidget } from "../chat/CustomerChatWidget.tsx";

export function StoreLayout() {
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(location.pathname);
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname);
    setCartOpen(false);
  }

  return (
    <div className="shell">
      <Header onOpenCart={() => setCartOpen(true)} />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      <CustomerChatWidget />
    </div>
  );
}
