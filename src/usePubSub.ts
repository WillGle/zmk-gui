import Emittery from "emittery";
import { useEffect } from "react";
import type { Notification } from "@zmkfirmware/zmk-studio-ts-client";
import type { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";

type Events = {
  rpc_notification: Notification;
  "rpc_notification.core.lockStateChanged": LockState;
  "rpc_notification.keymap.unsavedChangesStatusChanged": boolean;
};

const emitter = new Emittery<Events>();

export const publish = <Name extends keyof Events>(name: Name, data: Events[Name]) =>
  emitter.emit(name, data);

export const useSub = <Name extends keyof Events>(
  name: Name,
  callback: (data: Events[Name]) => void | Promise<void>
) => {
  const unsub = () => emitter.off(name, callback);

  // Be sure we unsub if unmounted.
  useEffect(() => {
    emitter.on(name, callback);
    return () => emitter.off(name, callback);
  }, [name, callback]);

  return unsub;
};
