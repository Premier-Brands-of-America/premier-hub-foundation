import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { titleForPath } from "@/lib/routeLabels";
import { brand } from "@/config/brand";

export function RouteAnnouncer() {
  const location = useLocation();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    const name = titleForPath(location.pathname);
    setAnnouncement(`Navigated to ${name}`);
    // Every route owns a real document title — browser tabs, history and
    // screen readers should never see a generic "Page".
    document.title = `${name} · ${brand.appName}`;
  }, [location.pathname]);

  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}
