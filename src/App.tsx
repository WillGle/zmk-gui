import { AppHeader } from "./AppHeader";
import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc, register_rpc_connection } from "./rpc/logging";
import type { Notification } from "@zmkfirmware/zmk-studio-ts-client/studio";
import { ConnectionState, ConnectionContext } from "./rpc/ConnectionContext";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectModal, TransportFactory } from "./ConnectModal";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { connect as gatt_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/gatt";
import { connect as serial_connect } from "@zmkfirmware/zmk-studio-ts-client/transport/serial";
import Keyboard from "./keyboard/Keyboard";
import { DoCallback, UndoRedoContext, useUndoRedo } from "./undoRedo";
import { publish, useSub } from "./usePubSub";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { LockStateContext } from "./rpc/LockStateContext";
import { UnlockModal } from "./UnlockModal";
import { AppFooter } from "./AppFooter";
import { AboutModal } from "./AboutModal";
import { LicenseNoticeModal } from "./misc/LicenseNoticeModal";

const TRANSPORTS: TransportFactory[] = [
  navigator.serial && { label: "USB", connect: serial_connect },
  ...(navigator.bluetooth && navigator.userAgent.indexOf("Linux") >= 0
    ? [{ label: "BLE", connect: gatt_connect }]
    : []),
].filter((t) => t !== undefined);

async function listen_for_notifications(
  stream: ReadableStream<Notification>,
  signal: AbortSignal
): Promise<void> {
  const reader = stream.getReader();
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) break;
      if (!value) continue;
      await publish("rpc_notification", value);
      if (signal.aborted) break;
      if (value.core?.lockStateChanged !== undefined) {
        await publish("rpc_notification.core.lockStateChanged", value.core.lockStateChanged);
      }
      if (value.keymap?.unsavedChangesStatusChanged !== undefined) {
        await publish("rpc_notification.keymap.unsavedChangesStatusChanged", value.keymap.unsavedChangesStatusChanged);
      }
    }
  } finally {
    signal.removeEventListener("abort", abort);
    reader.releaseLock();
  }
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

function App() {
  const [conn, setConn] = useState<ConnectionState>({ conn: null });
  const connectionRef = useRef(conn);
  const sessionRef = useRef<AbortController | null>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);
  const [doIt, undo, redo, canUndo, canRedo, reset] = useUndoRedo();
  const [showAbout, setShowAbout] = useState(false);
  const [showLicenseNotice, setShowLicenseNotice] = useState(false);
  const [lockState, setLockState] = useState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);

  const updateConnection = useCallback((next: ConnectionState) => {
    connectionRef.current = next;
    reset();
    pendingRef.current = 0;
    setPending(0);
    setLockState(LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
    setConn(next);
  }, [reset]);

  const isCurrent = (snapshot: ConnectionState) =>
    connectionRef.current === snapshot && !!snapshot.conn && !snapshot.signal?.aborted;

  useSub("rpc_notification.core.lockStateChanged", (state) => {
    if (connectionRef.current.conn && !connectionRef.current.signal?.aborted) setLockState(state);
  });

  useEffect(() => {
    if (!conn.conn) return;
    let ignore = false;
    call_rpc(conn.conn, { core: { getLockState: true } })
      .then((response) => {
        if (!ignore && isCurrent(conn)) {
          setLockState(response.core?.getLockState ?? LockState.ZMK_STUDIO_CORE_LOCK_STATE_LOCKED);
        }
      })
      .catch((failure) => { if (!ignore && isCurrent(conn)) setError(errorMessage(failure)); });
    return () => { ignore = true; };
  }, [conn]);

  useEffect(() => () => sessionRef.current?.abort(new Error("App closed.")), []);

  const onConnect = useCallback((transport: RpcTransport) => {
    const previous = sessionRef.current;
    const session = new AbortController();
    sessionRef.current = session;
    previous?.abort(new Error("Connection replaced."));
    updateConnection({ conn: null });
    setConnectedDeviceName(undefined);
    setError(undefined);
    setConnecting(true);

    const endSession = () => {
      transport.abortController.abort(session.signal.reason);
      if (sessionRef.current !== session) return;
      updateConnection({ conn: null });
      setConnectedDeviceName(undefined);
      setConnecting(false);
      if (session.signal.reason?.message !== "Disconnected by user.") {
        setError(errorMessage(session.signal.reason || new Error("Device disconnected.")));
      }
    };
    session.signal.addEventListener("abort", endSession, { once: true });

    void (async () => {
      try {
        const rpc = await create_rpc_connection(transport, { signal: session.signal });
        register_rpc_connection(rpc, session.signal, failure => session.abort(failure));
        const response = await call_rpc(rpc, { core: { getDeviceInfo: true } });
        if (!response.core?.getDeviceInfo) throw new Error("The selected device did not return Studio device information.");
        session.signal.throwIfAborted();
        if (sessionRef.current !== session) return;
        updateConnection({ conn: rpc, signal: session.signal });
        setConnectedDeviceName(response.core.getDeviceInfo.name);
        setConnecting(false);
        void listen_for_notifications(rpc.notification_readable, session.signal)
          .then(() => { if (!session.signal.aborted) session.abort(new Error("Device disconnected. Reconnect to continue.")); })
          .catch(failure => session.abort(failure));
      } catch (failure) {
        session.abort(failure instanceof Error ? failure : new Error(String(failure)));
      }
    })();
  }, [updateConnection]);

  const runMutation = useCallback(async (action: DoCallback) => {
    const snapshot = connectionRef.current;
    if (!isCurrent(snapshot)) throw new Error("Not connected.");
    if (pendingRef.current) throw new Error("Wait for the current change to finish.");
    pendingRef.current++;
    setPending(pendingRef.current);
    setError(undefined);
    try {
      await doIt(action);
    } catch (failure) {
      if (isCurrent(snapshot)) setError(errorMessage(failure));
      throw failure;
    } finally {
      if (isCurrent(snapshot)) {
        pendingRef.current--;
        setPending(pendingRef.current);
      }
    }
  }, [doIt]);

  const runCommand = async (action: (snapshot: ConnectionState) => Promise<void>) => {
    const snapshot = connectionRef.current;
    if (!isCurrent(snapshot) || pendingRef.current) throw new Error("Wait for the current change to finish.");
    pendingRef.current++;
    setPending(pendingRef.current);
    setError(undefined);
    try {
      await action(snapshot);
    } catch (failure) {
      if (isCurrent(snapshot)) setError(errorMessage(failure));
      throw failure;
    } finally {
      if (isCurrent(snapshot)) {
        pendingRef.current--;
        setPending(pendingRef.current);
      }
    }
  };

  const save = () => runCommand(async snapshot => {
    const response = await call_rpc(snapshot.conn!, { keymap: { saveChanges: true } });
    if (!response.keymap?.saveChanges?.ok) throw new Error("Device rejected Save. Try again.");
  });

  const discard = () => runCommand(async snapshot => {
    const response = await call_rpc(snapshot.conn!, { keymap: { discardChanges: true } });
    if (!response.keymap?.discardChanges) throw new Error("Device rejected Discard. Changes were not discarded.");
    if (isCurrent(snapshot)) updateConnection({ ...snapshot });
  }).catch(() => {});

  const resetSettings = () => runCommand(async snapshot => {
    const response = await call_rpc(snapshot.conn!, { core: { resetSettings: true } });
    if (!response.core?.resetSettings) throw new Error("Device rejected settings reset.");
    if (isCurrent(snapshot)) updateConnection({ ...snapshot });
  }).catch(() => {});

  const disconnect = () => {
    sessionRef.current?.abort(new Error("Disconnected by user."));
    setError(undefined);
  };

  return (
    <ConnectionContext.Provider value={conn}>
      <LockStateContext.Provider value={lockState}>
        <UndoRedoContext.Provider value={runMutation}>
          <UnlockModal />
          <ConnectModal open={!conn.conn} transports={TRANSPORTS} onTransportCreated={onConnect} error={error} connecting={connecting} />
          <AboutModal open={showAbout} onClose={() => setShowAbout(false)} />
          <LicenseNoticeModal open={showLicenseNotice} onClose={() => setShowLicenseNotice(false)} />
          <div className={`bg-base-100 text-base-content h-full max-h-[100vh] w-full max-w-[100vw] inline-grid grid-cols-[auto] ${error && conn.conn ? "grid-rows-[auto_auto_1fr_auto]" : "grid-rows-[auto_1fr_auto]"} overflow-hidden`}>
            <AppHeader
              connectedDeviceLabel={connectedDeviceName}
              canUndo={canUndo && !pending}
              canRedo={canRedo && !pending}
              busy={pending > 0}
              onUndo={() => runCommand(async () => undo()).catch(() => {})}
              onRedo={() => runCommand(async () => redo()).catch(() => {})}
              onSave={save}
              onDiscard={discard}
              onDisconnect={disconnect}
              onResetSettings={resetSettings}
            />
            {error && conn.conn && <div role="alert" className="p-3 bg-base-200">{error}</div>}
            <fieldset disabled={pending > 0} className="grid min-w-0 min-h-0 border-0 p-0 m-0">
              <Keyboard />
            </fieldset>
            <AppFooter onShowAbout={() => setShowAbout(true)} onShowLicenseNotice={() => setShowLicenseNotice(true)} />
          </div>
        </UndoRedoContext.Provider>
      </LockStateContext.Provider>
    </ConnectionContext.Provider>
  );
}

export default App;
