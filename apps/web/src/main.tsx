import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { ApiError } from "./features/nodes/use-node-tree";
import { AuthPage } from "./routes/auth-page";
import { ProtectedLayout } from "./routes/protected-layout";
import { DataRoomPage } from "./routes/data-room-page";
import { PublicSharePage } from "./routes/public-share-page";
import "./index.css";

// A 4xx is never transient — retrying "not found" or "conflict" wastes the
// default 3 retries' worth of backoff (~7s) before the UI can react to it.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status >= 400 && error.status < 500
          ? false
          : failureCount < 3,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/signup" element={<AuthPage mode="sign-up" />} />
          <Route path="/s/:token" element={<PublicSharePage />} />
          <Route path="/s/:token/folder/:nodeId" element={<PublicSharePage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DataRoomPage />} />
            <Route path="/folder/:id" element={<DataRoomPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
