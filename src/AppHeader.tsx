import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import type { RequestResponse } from "@zmkfirmware/zmk-studio-ts-client";
import { useConnectedDeviceData } from "./rpc/useConnectedDeviceData";
import { useSub } from "./usePubSub";
import { useContext, useEffect, useRef, useState } from "react";
import { useModalRef } from "./misc/useModalRef";
import { LockStateContext } from "./rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { ConnectionContext } from "./rpc/ConnectionContext";
import { ChevronDown, Undo2, Redo2, Save, Trash2 } from "lucide-react";
import { Tooltip } from "./misc/Tooltip";
import { GenericModal } from "./GenericModal";

export interface AppHeaderProps {
  connectedDeviceLabel?: string;
  busy?: boolean;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void | Promise<void>;
  onUndo?: () => Promise<void>;
  onRedo?: () => Promise<void>;
  onResetSettings?: () => void | Promise<void>;
  onDisconnect?: () => void | Promise<void>;
  canUndo?: boolean;
  canRedo?: boolean;
}

const unsavedRequest = { keymap: { checkUnsavedChanges: true } };
const unsavedFromResponse = (response: RequestResponse) =>
  response.keymap?.checkUnsavedChanges;

export const AppHeader = ({
  connectedDeviceLabel,
  busy = false,
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  onSave,
  onDiscard,
  onDisconnect,
  onResetSettings,
}: AppHeaderProps) => {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showSettingsReset, setShowSettingsReset] = useState(false);

  const lockState = useContext(LockStateContext);
  const connectionState = useContext(ConnectionContext);
  const connectionRef = useRef(connectionState);
  connectionRef.current = connectionState;

  useEffect(() => {
    if (
      (!connectionState.conn ||
        lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) &&
      showSettingsReset
    ) {
      setShowSettingsReset(false);
    }
  }, [connectionState.conn, lockState, showSettingsReset]);

  const showSettingsRef = useModalRef(showSettingsReset);
  const [unsaved, setUnsaved] = useConnectedDeviceData<boolean>(
    unsavedRequest,
    unsavedFromResponse
  );

  useSub("rpc_notification.keymap.unsavedChangesStatusChanged", (unsaved) =>
    setUnsaved(unsaved)
  );

  useEffect(() => {
    setSaveStatus("idle");
  }, [connectionState, unsaved]);

  const save = async () => {
    if (!onSave || saveStatus === "saving") return;
    const connection = connectionState;
    setSaveStatus("saving");
    try {
      await onSave();
      if (connectionRef.current === connection && !connection.signal?.aborted) setSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save changes", error);
      if (connectionRef.current === connection && !connection.signal?.aborted) setSaveStatus("error");
    }
  };

  return (
    <header className="top-0 left-0 right-0 flex items-center justify-between min-h-14 max-w-full gap-2 flex-wrap">
      <div className="flex px-3 items-center gap-1">
        <img src="/zmk.svg" alt="ZMK Logo" className="h-8 rounded" />
        <p>Curve E</p>
      </div>
      <GenericModal ref={showSettingsRef} className="max-w-[50vw]">
        <h2 className="my-2 text-lg">Restore Stock Settings</h2>
        <div>
          <p>
            Settings reset will remove any customizations previously made in ZMK
            Studio and restore the stock keymap
          </p>
          <p>Continue?</p>
          <div className="flex justify-end my-2 gap-3">
            <Button
              className="rounded bg-base-200 hover:bg-base-300 px-3 py-2"
              onPress={() => setShowSettingsReset(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded bg-base-200 hover:bg-base-300 px-3 py-2"
              onPress={() => {
                setShowSettingsReset(false);
                onResetSettings?.();
              }}
            >
              Restore Stock Settings
            </Button>
          </div>
        </div>
      </GenericModal>
      <MenuTrigger>
        <Button
          className="text-center rac-disabled:opacity-0 hover:bg-base-300 transition-all duration-100 p-1 pl-2 rounded-lg"
          isDisabled={!connectedDeviceLabel}
        >
          {connectedDeviceLabel}
          <ChevronDown className="inline-block w-4" />
        </Button>
        <Popover>
          <Menu className="shadow-md rounded bg-base-100 text-base-content cursor-pointer overflow-hidden">
            <MenuItem
              className="px-2 py-1 hover:bg-base-200"
              onAction={onDisconnect}
            >
              Disconnect
            </MenuItem>
            <MenuItem
              className="px-2 py-1 hover:bg-base-200"
              isDisabled={busy}
              onAction={() => setShowSettingsReset(true)}
            >
              Restore Stock Settings
            </MenuItem>
          </Menu>
        </Popover>
      </MenuTrigger>
      <div className="flex justify-end items-center flex-wrap gap-2 px-2">
        <span role="status" aria-live="polite" className="text-sm">
          {!connectionState.conn ? "Disconnected" : saveStatus === "saving" ? "Saving…" : saveStatus === "error" ? "Save failed. Try again." : unsaved ? "Unsaved changes" : saveStatus === "saved" ? "Saved successfully" : unsaved === false ? "All changes saved" : "Reading save status…"}
        </span>
        {onUndo && (
          <Tooltip label="Undo">
            <Button
              className="flex items-center justify-center p-1.5 rounded enabled:hover:bg-base-300 disabled:opacity-50"
              isDisabled={!canUndo}
              onPress={onUndo}
            >
              <Undo2 className="inline-block w-4 mx-1" aria-label="Undo" />
            </Button>
          </Tooltip>
        )}

        {onRedo && (
          <Tooltip label="Redo">
            <Button
              className="flex items-center justify-center p-1.5 rounded enabled:hover:bg-base-300 disabled:opacity-50"
              isDisabled={!canRedo}
              onPress={onRedo}
            >
              <Redo2 className="inline-block w-4 mx-1" aria-label="Redo" />
            </Button>
          </Tooltip>
        )}
        <Tooltip label="Save">
          <Button
            className="flex items-center justify-center p-1.5 rounded enabled:hover:bg-base-300 disabled:opacity-50"
            isDisabled={busy || !unsaved || !connectionState.conn || lockState !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED || saveStatus === "saving"}
            onPress={save}
          >
            <Save className="inline-block w-4 mx-1" aria-hidden="true" />
            <span>{saveStatus === "saving" ? "Saving…" : "Save"}</span>
          </Button>
        </Tooltip>
        <Tooltip label="Discard">
          <Button
            className="flex items-center justify-center p-1.5 rounded enabled:hover:bg-base-300 disabled:opacity-50"
            onPress={onDiscard}
            isDisabled={busy || !unsaved}
          >
            <Trash2 className="inline-block w-4 mx-1" aria-label="Discard" />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
};
