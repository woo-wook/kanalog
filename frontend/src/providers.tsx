"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { RegisterSw } from "./register-sw";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <RegisterSw />
      {children}
    </QueryClientProvider>
  );
}
