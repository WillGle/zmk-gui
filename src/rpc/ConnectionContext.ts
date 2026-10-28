import { createContext } from "react";

import { RpcConnection } from "@zmkfirmware/zmk-studio-ts-client/index";

export interface ConnectionState {
  conn: RpcConnection | null;
  signal?: AbortSignal;
}

export const ConnectionContext = createContext<ConnectionState>({ conn: null });
