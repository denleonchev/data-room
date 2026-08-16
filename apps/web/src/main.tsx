import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthPage } from "./routes/auth-page";
import { ProtectedLayout } from "./routes/protected-layout";
import { DataRoomPage } from "./routes/data-room-page";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage mode="sign-in" />} />
          <Route path="/signup" element={<AuthPage mode="sign-up" />} />
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
