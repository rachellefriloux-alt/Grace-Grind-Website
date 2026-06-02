import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <>
      <SiteHeader />
      <main className="not-found">
        <div className="not-found-panel">
          <AlertCircle size={46} />
          <span className="badge">404</span>
          <h1>That page is not on the list.</h1>
          <p>
            The Grace & Grind website could not find that address. Head back to
            the homepage and choose the service you need.
          </p>
          <button className="btn-primary" type="button" onClick={handleGoHome}>
            <Home size={17} />
            Go home
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
