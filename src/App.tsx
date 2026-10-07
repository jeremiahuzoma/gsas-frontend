import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useState, type ReactNode } from "react";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";

import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// Admin and analytics (Recharts) load on demand to keep the dashboard bundle small.
const AdminPage = lazy(() => import("@/pages/admin"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));

function PageLoader({ children, label }: { children: ReactNode; label: string }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="label-caps">{label}</p>
        </main>
      }
    >
      {children}
    </Suspense>
  );
}

/** App shell (was src/routes/__root.tsx). */
function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}

/** Route map — identical URLs to the TanStack file routes. */
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: "/", element: <Home /> },
      {
        path: "/admin",
        element: (
          <PageLoader label="Checking credentials…">
            <AdminPage />
          </PageLoader>
        ),
      },
      {
        path: "/analytics",
        element: (
          <PageLoader label="Compiling analytics…">
            <AnalyticsPage />
          </PageLoader>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default function App() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
