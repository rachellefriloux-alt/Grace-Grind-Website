import { Menu, X } from "lucide-react";
import { useState } from "react";

type SiteHeaderProps = {
  active?: "home" | "book" | "portal" | "admin";
};

type SiteFooterProps = {
  locationLine?: boolean;
};

const facebookHref = "https://www.facebook.com/GracenGrind/";

export function SiteHeader({ active = "home" }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav>
      <a href="/" className="nav-brand">
        Grace <span>&amp;</span> Grind
      </a>
      <ul className="nav-links">
        <li>
          <a href="/" className={active === "home" ? "active" : ""}>
            Home
          </a>
        </li>
        <li>
          <a href="/book.html" className={active === "book" ? "active" : ""}>
            Book
          </a>
        </li>
        <li>
          <a href="/signup" className={active === "portal" ? "active" : ""}>
            Client Portal
          </a>
        </li>
      </ul>
      <a href="/book.html" className="nav-cta">
        Request Service
      </a>
      <button
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        className="nav-menu-button"
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <div className={`mobile-nav-panel ${menuOpen ? "open" : ""}`}>
        <a href="/" className={active === "home" ? "active" : ""}>
          Home
        </a>
        <a href="/book.html" className={active === "book" ? "active" : ""}>
          Book
        </a>
        <a href="/signup" className={active === "portal" ? "active" : ""}>
          Client Portal
        </a>
        <a href={facebookHref} target="_blank" rel="noreferrer">
          Facebook
        </a>
      </div>
    </nav>
  );
}

export function SiteFooter({ locationLine = false }: SiteFooterProps) {
  return (
    <footer>
      <p>
        Grace &amp; Grind
        {locationLine ? " · Albany, Louisiana" : ""} · 2026
      </p>
      <a href={facebookHref} target="_blank" rel="noreferrer">
        Facebook page
      </a>
    </footer>
  );
}
