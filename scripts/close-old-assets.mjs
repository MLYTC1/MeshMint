/**
 * Close old on-chain Asset accounts whose asset_id is NOT a valid IPFS CID.
 * Uses @solana/web3.js v1 for simplicity in script context.
 *
 * Usage: node scripts/close-old-assets.mjs
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(
  "3z9VVHRqRW8ywzy2mtkpmDAGMjqgGkz8iz1dtXGs75xH",
);
const RPC_URL = "https://api.devnet.solana.com";
const CID_RE = /^(Qm[a-zA-Z0-9]{44}|bafy[a-z0-9]{50,})$/;

// close_asset discriminator from generated code
const CLOSE_ASSET_DISCRIMINATOR = Buffer.from([
  39, 124, 90, 146, 16, 82, 77, 253,
]);

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  const keypairPath = resolve(
    process.env.HOME || "~",
    ".config/solana/id.json",
  );
  const secretKey = new Uint8Array(
    JSON.parse(readFileSync(keypairPath, "utf8")),
  );
  const wallet = Keypair.fromSecretKey(secretKey);
  console.log(`Wallet: ${wallet.publicKey.toBase58()}`);

  const accounts = await connection.getProgramAccounts(PROGRAM_ID);
  console.log(`Total on-chain accounts: ${accounts.length}`);

  const oldAssets = [];
  for (const { pubkey, account } of accounts) {
    const data = account.data;
    // Skip if too small (discriminator 8 + creator 32 + string len 4 = 44 min)
    if (data.length < 44) continue;

    // Read asset_id string
    const strLen = data.readUInt32LE(40);
    if (strLen > 96 || 44 + strLen > data.length) continue;
    const assetId = data.slice(44, 44 + strLen).toString("utf8");

    // Read creator pubkey (bytes 8-40)
    const creator = new PublicKey(data.slice(8, 40));

    if (!CID_RE.test(assetId)) {
      oldAssets.push({ pubkey, assetId, creator });
    }
  }

  console.log(`Found ${oldAssets.length} old (non-CID) asset(s) to close\n`);

  let closed = 0;
  let skipped = 0;

  for (const asset of oldAssets) {
    const idPreview =
      asset.assetId.length > 30
        ? asset.assetId.slice(0, 30) + "…"
        : asset.assetId;
    console.log(`  ${asset.pubkey.toBase58()} → "${idPreview}"`);

    if (!asset.creator.equals(wallet.publicKey)) {
      console.log("    ⚠ Skipping — different creator");
      skipped++;
      continue;
    }

    try {
      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: asset.pubkey, isSigner: false, isWritable: true },
          {
            pubkey: new PublicKey("11111111111111111111111111111111"),
            isSigner: false,
            isWritable: false,
          },
        ],
        data: CLOSE_ASSET_DISCRIMINATOR,
      });

      const tx = new Transaction().add(ix);
      const sig = await connection.sendTransaction(tx, [wallet]);
      await connection.confirmTransaction(sig, "confirmed");
      console.log(`    ✓ Closed — sig: ${sig}`);
      closed++;
    } catch (err) {
      console.error(`    ✗ Failed:`, err.message || err);
    }
  }

  console.log(
    `\nDone. Closed: ${closed}, Skipped: ${skipped}, Total old: ${oldAssets.length}`,
  );
}

main().catch(console.error);
