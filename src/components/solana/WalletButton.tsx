import { useWalletConnection } from "@solana/react-hooks";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

export function WalletButton() {
  const { wallet, status, disconnect, connect, connectors } =
    useWalletConnection();
  const address = wallet?.account.address.toString();

  if (address) {
    const short = `${address.slice(0, 4)}…${address.slice(-4)}`;
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => disconnect()}
        className="gap-2 font-mono"
      >
        <span>{short}</span>
        <LogOut className="h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      onClick={() => connectors[0] && connect(connectors[0].id)}
      disabled={status === "connecting" || connectors.length === 0}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {status === "connecting" ? "Connecting..." : "Connect Wallet"}
    </Button>
  );
}
