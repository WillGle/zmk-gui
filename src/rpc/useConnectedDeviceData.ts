import React, { SetStateAction, useContext, useEffect, useState } from "react";
import { ConnectionContext } from "./ConnectionContext";

import { call_rpc } from "./logging";

import { Request, RequestResponse } from "@zmkfirmware/zmk-studio-ts-client";
import { LockStateContext } from "./LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";

export function useConnectedDeviceData<T>(
  req: Omit<Request, "requestId">,
  response_mapper: (resp: RequestResponse) => T | undefined,
  requireUnlock?: boolean
): [T | undefined, React.Dispatch<SetStateAction<T | undefined>>] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const [data, setData] = useState<T | undefined>(undefined);

  const canLoad = !requireUnlock || lockState === LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED;

  useEffect(
    () => {
      if (!connection.conn || !canLoad) {
        setData(undefined);
        return;
      }

      async function startRequest() {
        setData(undefined);
        if (!connection.conn) {
          return;
        }

        const response = response_mapper(await call_rpc(connection.conn, req));

        if (!ignore) {
          setData(response);
        }
      }

      let ignore = false;
      startRequest().catch((error) => {
        if (!ignore) console.error("Failed to load device data", error);
      });

      return () => {
        ignore = true;
      };
    },
    [connection, canLoad, req, response_mapper]
  );

  return [data, setData];
}
