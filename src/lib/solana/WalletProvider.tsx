import type { ReactNode } from "react";
import { Providers } from "@/providers";

export function MeshWalletProvider({ children }: { children: ReactNode }) {
  return <Providers>{children}</Providers>;
}
