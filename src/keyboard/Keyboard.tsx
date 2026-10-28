import React, {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Request, RequestResponse } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "../rpc/logging";
import {
  PhysicalLayout,
  Keymap,
  SetLayerBindingResponse,
  SetLayerPropsResponse,
  BehaviorBinding,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { LayerPicker } from "./LayerPicker";
import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";
import { Keymap as KeymapComp } from "./Keymap";
import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { UndoRedoContext } from "../undoRedo";
import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { produce } from "immer";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { deserializeLayoutZoom, LayoutZoom } from "./layoutZoom";
import { useLocalStorageState } from "../misc/useLocalStorageState";

const keymapRequest = { keymap: { getKeymap: true } };
const keymapFromResponse = (response: RequestResponse) =>
  response.keymap?.getKeymap;

type BehaviorMap = Record<number, GetBehaviorDetailsResponse>;

function useBehaviors(onError: (error: unknown) => void): BehaviorMap {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const [behaviors, setBehaviors] = useState<BehaviorMap>({});

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setBehaviors({});
      return;
    }

    async function startRequest() {
      setBehaviors({});

      if (!connection.conn) {
        return;
      }

      const get_behaviors: Request = {
        behaviors: { listAllBehaviors: true },
        requestId: 0,
      };

      const behavior_list = await call_rpc(connection.conn, get_behaviors);
      if (!ignore) {
        const behavior_map: BehaviorMap = {};
        for (const behaviorId of behavior_list.behaviors?.listAllBehaviors
          ?.behaviors || []) {
          if (ignore) {
            break;
          }
          const details_req = {
            behaviors: { getBehaviorDetails: { behaviorId } },
            requestId: 0,
          };
          const behavior_details = await call_rpc(connection.conn, details_req);
          const dets: GetBehaviorDetailsResponse | undefined =
            behavior_details?.behaviors?.getBehaviorDetails;

          if (dets) {
            behavior_map[dets.id] = dets;
          }
        }

        if (!ignore) {
          setBehaviors(behavior_map);
        }
      }
    }

    let ignore = false;
    startRequest().catch((error) => {
      if (!ignore) onError(error);
    });

    return () => {
      ignore = true;
    };
  }, [connection, lockState, onError]);

  return behaviors;
}

function useLayouts(onError: (error: unknown) => void): [
  PhysicalLayout[] | undefined,
  React.Dispatch<SetStateAction<PhysicalLayout[] | undefined>>,
  number,
  React.Dispatch<SetStateAction<number>>
] {
  const connection = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);

  const [layouts, setLayouts] = useState<PhysicalLayout[] | undefined>(
    undefined
  );
  const [selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex] =
    useState<number>(0);

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setLayouts(undefined);
      return;
    }

    async function startRequest() {
      setLayouts(undefined);

      if (!connection.conn) {
        return;
      }

      const response = await call_rpc(connection.conn, {
        keymap: { getPhysicalLayouts: true },
      });

      if (!ignore) {
        setLayouts(response?.keymap?.getPhysicalLayouts?.layouts);
        setSelectedPhysicalLayoutIndex(
          response?.keymap?.getPhysicalLayouts?.activeLayoutIndex || 0
        );
      }
    }

    let ignore = false;
    startRequest().catch((error) => {
      if (!ignore) onError(error);
    });

    return () => {
      ignore = true;
    };
  }, [connection, lockState, onError]);

  return [
    layouts,
    setLayouts,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ];
}

export default function Keyboard() {
  const [error, setError] = useState<string>();
  const [pickerVersion, setPickerVersion] = useState(0);
  const onError = useCallback((error: unknown) => {
    setError(error instanceof Error ? error.message : String(error));
  }, []);
  const [
    layouts,
    ,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ] = useLayouts(onError);
  const [keymap, updateKeymap] = useConnectedDeviceData<Keymap>(
    keymapRequest,
    keymapFromResponse,
    true
  );

  const [keymapScale, setKeymapScale] = useLocalStorageState<LayoutZoom>("keymapScale", "auto", {
    deserialize: deserializeLayoutZoom,
  });

  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<
    number | undefined
  >(undefined);
  const behaviors = useBehaviors(onError);

  const conn = useContext(ConnectionContext);
  const lockState = useContext(LockStateContext);
  const undoRedo = useContext(UndoRedoContext);
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;
  const layoutRef = useRef(selectedPhysicalLayoutIndex);
  layoutRef.current = selectedPhysicalLayoutIndex;
  const currentLockState = useRef(lockState);
  currentLockState.current = lockState;
  const session = useRef({ conn, active: true });
  if (session.current.conn !== conn) {
    session.current = { conn, active: true };
  }
  const activeSession = session.current;
  const isCurrentSession = () => session.current === activeSession && activeSession.active && !conn.signal?.aborted;
  const setKeymap = (next: SetStateAction<Keymap | undefined>) => {
    const value = typeof next === "function" ? next(keymapRef.current) : next;
    keymapRef.current = value;
    updateKeymap(value);
  };

  useEffect(() => {
    activeSession.active = true;
    setSelectedLayerIndex(0);
    setSelectedKeyPosition(undefined);
    setError(undefined);
    setPickerVersion((version) => version + 1);
    return () => {
      activeSession.active = false;
    };
  }, [activeSession]);

  // Check both sides of an RPC so a reply from an old session cannot update this UI.
  const request = async (req: Omit<Request, "requestId">) => {
    try {
      if (!isCurrentSession() || !conn.conn ||
          currentLockState.current !== LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED) {
        throw new Error("Keyboard is disconnected or locked");
      }
      const response = await call_rpc(conn.conn, req);
      if (!isCurrentSession()) throw new Error("Keyboard session changed");
      return response;
    } catch (error) {
      if (isCurrentSession()) onError(error);
      throw error;
    }
  };

  const runAction = (action: () => Promise<() => Promise<void>>) => {
    setError(undefined);
    void undoRedo?.(async () => {
      try {
        const undo = await action();
        return async () => {
          try {
            await undo();
          } catch (error) {
            if (isCurrentSession()) {
              onError(error);
              setPickerVersion((version) => version + 1);
            }
            throw error;
          }
        };
      } catch (error) {
        if (isCurrentSession()) {
          onError(error);
          setPickerVersion((version) => version + 1);
        }
        throw error;
      }
    }).catch((error) => {
      if (isCurrentSession()) onError(error);
    });
  };

  const doSelectPhysicalLayout = (index: number) => {
    const select = async (index: number) => {
      const response = await request({ keymap: { setActivePhysicalLayout: index } });
      const next = response.keymap?.setActivePhysicalLayout?.ok;
      if (!next) throw new Error("Failed to change physical layout");
      setKeymap(next);
      layoutRef.current = index;
      setSelectedPhysicalLayoutIndex(index);
      setSelectedKeyPosition(undefined);
    };
    runAction(async () => {
      const previous = layoutRef.current;
      await select(index);
      return () => select(previous);
    });
  };

  const doUpdateBinding = (binding: BehaviorBinding) => {
    const layerId = keymap?.layers[selectedLayerIndex]?.id;
    const keyPosition = selectedKeyPosition;
    if (layerId === undefined || keyPosition === undefined) return;
    const update = async (binding: BehaviorBinding) => {
      const response = await request({ keymap: {
        setLayerBinding: { layerId, keyPosition, binding },
      } });
      if (response.keymap?.setLayerBinding !== SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK) {
        throw new Error("Failed to set binding: " + response.keymap?.setLayerBinding);
      }
      setKeymap(produce((draft: Keymap | undefined) => {
        const layer = draft?.layers.find((layer) => layer.id === layerId);
        if (layer) layer.bindings[keyPosition] = binding;
      }));
    };
    runAction(async () => {
      const previous = keymapRef.current?.layers.find((layer) => layer.id === layerId)?.bindings[keyPosition];
      if (!previous) throw new Error("Selected key is no longer available");
      await update(binding);
      return () => update(previous);
    });
  };

  const selectedBinding = useMemo(() => {
    if (keymap == null || selectedKeyPosition == null || !keymap.layers[selectedLayerIndex]) {
      return null;
    }

    return keymap.layers[selectedLayerIndex].bindings[selectedKeyPosition];
  }, [keymap, selectedLayerIndex, selectedKeyPosition]);

  const moveLayer = (start: number, end: number) => {
    const move = async (startIndex: number, destIndex: number) => {
      const response = await request({ keymap: { moveLayer: { startIndex, destIndex } } });
      const next = response.keymap?.moveLayer?.ok;
      if (!next) throw new Error("Failed to move layer");
      setKeymap(next);
      setSelectedLayerIndex(destIndex);
    };
    runAction(async () => {
      await move(start, end);
      return () => move(end, start);
    });
  };

  const deleteLayer = async (layerIndex: number) => {
    const response = await request({ keymap: { removeLayer: { layerIndex } } });
    if (!response.keymap?.removeLayer?.ok) throw new Error("Failed to remove layer");
    setKeymap(produce((draft: Keymap | undefined) => {
      if (!draft) return;
      draft.layers.splice(layerIndex, 1);
      draft.availableLayers++;
    }));
    setSelectedLayerIndex((index) => Math.max(0, Math.min(index, (keymapRef.current?.layers.length ?? 1) - 1)));
  };

  const addLayer = () => runAction(async () => {
    const response = await request({ keymap: { addLayer: {} } });
    const added = response.keymap?.addLayer?.ok;
    if (!added) throw new Error("Failed to add layer");
    setKeymap(produce((draft: Keymap | undefined) => {
      if (!draft) return;
      draft.layers.splice(added.index, 0, added.layer!);
      draft.availableLayers--;
    }));
    setSelectedLayerIndex(added.index);
    return () => deleteLayer(added.index);
  });

  const removeLayer = () => {
    const selectedId = keymap?.layers[selectedLayerIndex]?.id;
    runAction(async () => {
      const index = keymapRef.current?.layers.findIndex((layer) => layer.id === selectedId) ?? -1;
      if (index < 0 || selectedId === undefined) throw new Error("Selected layer is no longer available");
      await deleteLayer(index);
      return async () => {
        const response = await request({ keymap: { restoreLayer: { layerId: selectedId, atIndex: index } } });
        const restored = response.keymap?.restoreLayer?.ok;
        if (!restored) throw new Error("Failed to restore layer");
        setKeymap(produce((draft: Keymap | undefined) => {
          if (!draft) return;
          draft.layers.splice(index, 0, restored);
          draft.availableLayers--;
        }));
        setSelectedLayerIndex(index);
      };
    });
  };

  const changeLayerName = (id: number, _oldName: string, newName: string) => {
    const changeName = async (name: string) => {
      const response = await request({ keymap: { setLayerProps: { layerId: id, name } } });
      if (response.keymap?.setLayerProps !== SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK) {
        throw new Error("Failed to change layer name");
      }
      setKeymap(produce((draft: Keymap | undefined) => {
        const layer = draft?.layers.find((layer) => layer.id === id);
        if (layer) layer.name = name;
      }));
    };
    runAction(async () => {
      const previous = keymapRef.current?.layers.find((layer) => layer.id === id)?.name;
      if (previous === undefined) throw new Error("Selected layer is no longer available");
      await changeName(newName);
      return () => changeName(previous);
    });
  };

  useEffect(() => {
    if (!keymap?.layers) return;

    const layers = keymap.layers.length - 1;

    if (selectedLayerIndex > layers) {
      setSelectedLayerIndex(layers);
    }
  }, [keymap, selectedLayerIndex]);

  return (
    <div className="grid grid-cols-1 grid-rows-[auto_minmax(16em,1fr)_auto] md:grid-cols-[auto_1fr] md:grid-rows-[minmax(16em,1fr)_minmax(10em,auto)] overflow-auto bg-base-300 max-w-full min-w-0 min-h-0">
      <div className="p-2 flex flex-wrap flex-row md:flex-col gap-2 bg-base-200 md:row-span-2">
        {error && <p role="alert" className="p-3 bg-error text-error-content basis-full md:basis-auto md:max-w-xs">{error}</p>}
        {layouts?.[selectedPhysicalLayoutIndex] && (
          <div className="col-start-3 row-start-1 row-end-2">
            <PhysicalLayoutPicker
              layouts={layouts}
              selectedPhysicalLayoutIndex={selectedPhysicalLayoutIndex}
              onPhysicalLayoutClicked={doSelectPhysicalLayout}
            />
          </div>
        )}

        {keymap && (
          <div className="col-start-1 row-start-1 row-end-2">
            <LayerPicker
              layers={keymap.layers}
              selectedLayerIndex={selectedLayerIndex}
              onLayerClicked={setSelectedLayerIndex}
              onLayerMoved={moveLayer}
              canAdd={(keymap.availableLayers || 0) > 0}
              canRemove={(keymap.layers?.length || 0) > 1}
              onAddClicked={addLayer}
              onRemoveClicked={removeLayer}
              onLayerNameChanged={changeLayerName}
            />
          </div>
        )}
      </div>
      {layouts?.[selectedPhysicalLayoutIndex] && keymap && behaviors && (
        <div className={`p-8 pt-14 col-start-1 row-start-2 md:col-start-2 md:row-start-1 grid relative min-w-0 overflow-auto ${keymapScale === "auto" ? "items-center justify-center" : "items-start justify-start"}`}>
          <p className="absolute top-3 left-4 right-24 text-sm font-semibold">
            Layer {selectedLayerIndex}: {keymap.layers[selectedLayerIndex]?.name || "Unnamed"}
          </p>
          <KeymapComp
            keymap={keymap}
            layout={layouts[selectedPhysicalLayoutIndex]}
            behaviors={behaviors}
            scale={keymapScale}
            selectedLayerIndex={selectedLayerIndex}
            selectedKeyPosition={selectedKeyPosition}
            onKeyPositionClicked={setSelectedKeyPosition}
          />
          <select
            aria-label="Keyboard zoom"
            className="absolute top-2 right-2 h-8 rounded px-2"
            value={keymapScale}
            onChange={(e) => {
              const value = deserializeLayoutZoom(e.target.value);
              setKeymapScale(value);
            }}
          >
            <option value="auto">Auto</option>
            <option value={0.25}>25%</option>
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={2}>200%</option>
          </select>
        </div>
      )}
      {keymap && !selectedBinding && (
        <div className="p-6 col-start-1 row-start-3 md:col-start-2 md:row-start-2 bg-base-200 text-center">
          <p className="font-semibold">Select a key to edit its binding</p>
          <p className="mt-2 text-sm">Choose a key → find a binding → check the layer → Save</p>
        </div>
      )}
      {keymap && selectedBinding && (
        <div className="p-4 col-start-1 row-start-3 md:col-start-2 md:row-start-2 bg-base-200 overflow-auto">
          <p className="mb-2 text-lg font-semibold">
            Key {(selectedKeyPosition ?? 0) + 1} · Layer {selectedLayerIndex}: {keymap.layers[selectedLayerIndex]?.name || "Unnamed"}
          </p>
          <p className="mb-4 text-sm">Choose a binding below. Changes apply temporarily; use Save to keep them.</p>
          <BehaviorBindingPicker
            key={`${selectedLayerIndex}-${selectedKeyPosition}-${pickerVersion}`}
            binding={selectedBinding}
            behaviors={Object.values(behaviors)}
            layers={keymap.layers.map(({ id, name }, li) => ({
              id,
              name: name || li.toLocaleString(),
            }))}
            onBindingChanged={doUpdateBinding}
          />
        </div>
      )}
    </div>
  );
}
