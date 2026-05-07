import { useState, useEffect, useCallback } from "react";
import { useWalletConnection } from "@solana/react-hooks";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";

const LAMPORTS_PER_SOL = 1_000_000_000n;
const MARKETPLACE_PROGRAM_ID = new PublicKey(
  "HtQwAN1WeyKCrLkadB3rTNxZt7hmVkGB797Njz1m19xg"
);
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

type WalletAdapterLike = {
  sendTransaction(
    transaction: Transaction,
    connection: Connection
  ): Promise<TransactionSignature>;
};

export function VaultCard() {
  const { wallet, status } = useWalletConnection();

  const [amount, setAmount] = useState("");
  const [marketplaceBalanceLamports, setMarketplaceBalanceLamports] =
    useState(0n);
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const walletAddress = wallet?.account.address;

  useEffect(() => {
    async function getMarketplaceBalance() {
      const balance = await connection.getBalance(MARKETPLACE_PROGRAM_ID);
      setMarketplaceBalanceLamports(BigInt(balance));
    }

    getMarketplaceBalance().catch((err) => {
      console.error("Marketplace balance failed:", err);
    });
  }, []);

  const marketplaceSol =
    Number(marketplaceBalanceLamports) / Number(LAMPORTS_PER_SOL);

  const sendMarketplacePlaceholder = useCallback(
    async (action: "createListing" | "claimPayout") => {
      if (!walletAddress || !wallet?.sendTransaction) return;

      try {
        setIsSending(true);
        setTxStatus("Building transaction...");

        const signer = new PublicKey(walletAddress);
        const instruction = new TransactionInstruction({
          keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
          programId: MARKETPLACE_PROGRAM_ID,
          data: Buffer.alloc(0), // TODO: replace with Anchor instruction discriminator + args.
        });

        const transaction = new Transaction().add(instruction);
        transaction.feePayer = signer;

        setTxStatus("Awaiting signature...");

        const signature = await (wallet as unknown as WalletAdapterLike)
          .sendTransaction(transaction, connection);

        setTxStatus(
          `${action === "createListing" ? "Listing created" : "Payout claimed"}! Signature: ${signature.slice(0, 20)}...`
        );
        setAmount("");
      } catch (err) {
        console.error(`${action} failed:`, err);
        setTxStatus(
          `Error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setIsSending(false);
      }
    },
    [wallet, walletAddress]
  );

  const handleDeposit = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await sendMarketplacePlaceholder("createListing");
  }, [amount, sendMarketplacePlaceholder]);

  const handleWithdraw = useCallback(async () => {
    await sendMarketplacePlaceholder("claimPayout");
  }, [sendMarketplacePlaceholder]);

  if (status !== "connected") {
    return (
      <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
        <div className="space-y-1">
          <p className="text-lg font-semibold">SOL Marketplace</p>
          <p className="text-sm text-muted">
            Connect your wallet to interact with the marketplace program.
          </p>
        </div>
        <div className="rounded-lg bg-cream/50 p-4 text-center text-sm text-muted">
          Wallet not connected
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl space-y-4 rounded-2xl border border-border-low bg-card p-6 shadow-[0_20px_80px_-50px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-lg font-semibold">SOL Marketplace</p>
          <p className="text-sm text-muted">
            Create marketplace listings and claim payouts on devnet.
          </p>
        </div>
        <span className="rounded-full bg-cream px-3 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/80">
          {marketplaceBalanceLamports > 0n ? "Deployed" : "Empty"}
        </span>
      </div>

      {/* Marketplace Balance */}
      <div className="rounded-xl border border-border-low bg-cream/30 p-4">
        <p className="text-xs uppercase tracking-wide text-muted">
          Program Balance
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">
          {marketplaceSol.toFixed(4)}{" "}
          <span className="text-lg font-normal text-muted">SOL</span>
        </p>
        <p className="mt-2 truncate font-mono text-xs text-muted">
          {MARKETPLACE_PROGRAM_ID.toBase58()}
        </p>
      </div>

      {/* Create Listing Form */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount in SOL"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isSending}
            className="flex-1 rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            onClick={handleDeposit}
            disabled={
              isSending ||
              !amount ||
              parseFloat(amount) <= 0 ||
              !wallet?.sendTransaction
            }
            className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSending ? "Confirming..." : "Deposit"}
          </button>
        </div>
        {!wallet?.sendTransaction && (
          <p className="text-xs text-muted">
            Connected wallet does not expose a sendTransaction method.
          </p>
        )}
      </div>

      {/* Claim Payout Button */}
      <button
        onClick={handleWithdraw}
        disabled={isSending || !wallet?.sendTransaction}
        className="w-full rounded-lg border border-border-low bg-card px-4 py-2.5 text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSending ? "Confirming..." : "Withdraw All"}
      </button>

      {/* Status */}
      {txStatus && (
        <div className="rounded-lg border border-border-low bg-cream/50 px-4 py-3 text-sm">
          {txStatus}
        </div>
      )}

      {/* Educational Footer */}
      <div className="border-t border-border-low pt-4 text-xs text-muted">
        <p className="mb-2">
          This marketplace is an{" "}
          <a
            href="https://www.anchor-lang.com/docs"
            target="_blank"
            rel="noreferrer"
            className="font-medium underline underline-offset-2"
          >
            Anchor program
          </a>{" "}
          deployed on devnet. Want to deploy your own?
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://www.anchor-lang.com/docs/quickstart"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Anchor Quickstart
          </a>
          <a
            href="https://solana.com/docs/programs/deploying"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Deploy Programs
          </a>
          <a
            href="https://www.anchor-lang.com/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-cream px-2 py-1 font-medium transition hover:bg-cream/70"
          >
            Anchor Docs
          </a>
        </div>
      </div>
    </section>
  );
}
