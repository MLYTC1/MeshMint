import { Connection } from "@solana/web3.js";
import { SOLANA_RPC_URL } from "./config";

let _connection: Connection | null = null;

/** Singleton Solana RPC connection. */
export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(SOLANA_RPC_URL, "confirmed");
  }
  return _connection;
}
