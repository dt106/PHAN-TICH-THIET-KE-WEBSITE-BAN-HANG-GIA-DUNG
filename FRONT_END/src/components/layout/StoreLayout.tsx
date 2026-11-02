import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import "../../styles/store.css";
import { AiChatWidget } from "../chat/AiChatWidget.tsx";
import { CartDrawer } from "./CartDrawer.tsx";
import { Footer } from "./Footer.tsx";
import { Header } from "./Header.tsx";

export function StoreLayout() {
  const location = useLocation();
  const [cartState, setCartState] = useState({ path: location.pathname, open: false });
  const cartOpen = cartState.path === location.pathname && cartState.open;

  return (
    <div className="shell">
      <Header onOpenCart={() => setCartState({ path: location.pathname, open: true })} />
      <main className="page">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer open={cartOpen} onClose={() => setCartState({ path: location.pathname, open: false })} />
      <AiChatWidget />
    </div>
  );
}
