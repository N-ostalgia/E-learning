// src/lib/trpc/react.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/routers/root.router";

export const trpc = createTRPCReact<AppRouter>();