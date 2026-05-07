import { Boxes } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 py-10 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-mint">
            <Boxes className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium">
            Mesh<span className="text-gradient-mint">Mint</span>
          </span>
          <span className="ml-3 text-xs text-muted-foreground">
            The 3D creator economy on Solana
          </span>
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <span>Devnet ready</span>
          <span>Anchor-powered</span>
          <span>© {new Date().getFullYear()} Mesh Mint</span>
        </div>
      </div>
    </footer>
  );
}
