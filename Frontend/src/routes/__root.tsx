import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { useState } from "react";
import appCss from "../styles.css?url";
import { AuthContext, getStoredUser, getActiveChild, type User, type Child } from "@/lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-sky px-4">
      <div className="max-w-md text-center">
        <div className="text-8xl mb-4">🎈</div>
        <h1 className="text-5xl font-bold text-foreground">404</h1>
        <p className="mt-3 text-muted-foreground">Oops! This page floated away.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-primary-foreground font-bold shadow-soft hover:scale-105 transition">
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Beyond 21 — Adaptive Learning for Every Child" },
      { name: "description", content: "Beyond 21 — joyful adaptive learning for children with Down Syndrome, with Tunisian dialect speech recognition and parent insights." },
      { property: "og:title", content: "Beyond 21 — Adaptive Learning for Every Child" },
      { name: "twitter:title", content: "Beyond 21 — Adaptive Learning for Every Child" },
      { property: "og:description", content: "Beyond 21 — joyful adaptive learning for children with Down Syndrome, with Tunisian dialect speech recognition and parent insights." },
      { name: "twitter:description", content: "Beyond 21 — joyful adaptive learning for children with Down Syndrome, with Tunisian dialect speech recognition and parent insights." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/04b2c626-3ea6-4a71-8547-d0e8975c71e4/id-preview-ab63cd03--19043776-c16a-499e-af32-0d2e369e5e0a.lovable.app-1777848460983.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/04b2c626-3ea6-4a71-8547-d0e8975c71e4/id-preview-ab63cd03--19043776-c16a-499e-af32-0d2e369e5e0a.lovable.app-1777848460983.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Noto+Sans+Arabic:wght@500;700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const [user, setUserState] = useState<User | null>(() => getStoredUser());
  const [child, setChildState] = useState<Child | null>(() => getActiveChild());

  function setUser(u: User | null) {
    setUserState(u);
    if (!u) {
      setChildState(null);
    }
  }

  function setChild(c: Child | null) {
    setChildState(c);
  }

  return (
    <AuthContext.Provider value={{ user, child, setUser, setChild }}>
      <Outlet />
    </AuthContext.Provider>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
