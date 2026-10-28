import { useEffect, useId, useMemo, useState } from "react";

import {
  GetBehaviorDetailsResponse,
  BehaviorBindingParametersSet,
} from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { BehaviorBinding } from "@zmkfirmware/zmk-studio-ts-client/keymap";
import { BehaviorParametersPicker } from "./BehaviorParametersPicker";
import { validateValue } from "./parameters";

export interface BehaviorBindingPickerProps {
  binding: BehaviorBinding;
  behaviors: GetBehaviorDetailsResponse[];
  layers: { id: number; name: string }[];
  onBindingChanged: (binding: BehaviorBinding) => void;
}

function validateBinding(
  metadata: BehaviorBindingParametersSet[],
  layerIds: number[],
  param1?: number,
  param2?: number
): boolean {
  if (
    (param1 === undefined || param1 === 0) &&
    metadata.every((s) => !s.param1 || s.param1.length === 0)
  ) {
    return true;
  }

  let matchingSet = metadata.find((s) =>
    validateValue(layerIds, param1, s.param1)
  );

  if (!matchingSet) {
    return false;
  }

  return validateValue(layerIds, param2, matchingSet.param2);
}

export const BehaviorBindingPicker = ({
  binding,
  layers,
  behaviors,
  onBindingChanged,
}: BehaviorBindingPickerProps) => {
  const searchId = useId();
  const behaviorSelectId = useId();
  const [query, setQuery] = useState("");
  const [behaviorId, setBehaviorId] = useState(binding.behaviorId);
  const [param1, setParam1] = useState<number | undefined>(binding.param1);
  const [param2, setParam2] = useState<number | undefined>(binding.param2);

  const metadata = useMemo(
    () => behaviors.find((b) => b.id == behaviorId)?.metadata,
    [behaviorId, behaviors]
  );

  const sortedBehaviors = useMemo(
    () => [...behaviors].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [behaviors]
  );

  const filteredBehaviors = sortedBehaviors.filter((b) =>
    b.displayName.toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    if (
      binding.behaviorId === behaviorId &&
      binding.param1 === param1 &&
      binding.param2 === param2
    ) {
      return;
    }

    if (!metadata) {
      console.error(
        "Can't find metadata for the selected behaviorId",
        behaviorId
      );
      return;
    }

    if (
      validateBinding(
        metadata,
        layers.map(({ id }) => id),
        param1,
        param2
      )
    ) {
      onBindingChanged({
        behaviorId,
        param1: param1 || 0,
        param2: param2 || 0,
      });
    }
  }, [behaviorId, param1, param2]);

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 min-w-0 max-w-full">
          <label htmlFor={searchId}>Find binding</label>
          <input
            id={searchId}
            type="search"
            placeholder="Search binding types…"
            className="h-10 rounded px-3 max-w-full bg-base-100 border border-base-content/20"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0 max-w-full">
          <label htmlFor={behaviorSelectId}>Binding type</label>
          <select
            id={behaviorSelectId}
            value={behaviorId}
            className="h-10 rounded px-3 max-w-full bg-base-100"
            onChange={(e) => {
              setBehaviorId(parseInt(e.target.value));
              setParam1(0);
              setParam2(0);
            }}
          >
            {!filteredBehaviors.some((b) => b.id === behaviorId) && (
              <option value={behaviorId}>
                {behaviors.find((b) => b.id === behaviorId)?.displayName || "Current binding"} (current)
              </option>
            )}
            {["Keys & media", "Layers", "Other behaviors"].map((group) => (
              <optgroup key={group} label={group}>
                {filteredBehaviors.filter((b) => {
                  const parameters = b.metadata.flatMap((m) => [...m.param1, ...m.param2]);
                  const category = parameters.some((p) => p.hidUsage) ? "Keys & media" : parameters.some((p) => p.layerId) ? "Layers" : "Other behaviors";
                  return category === group;
                }).map((b) => <option key={b.id} value={b.id}>{b.displayName}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        <p className="text-sm text-base-content/70" role="status">
          {filteredBehaviors.length} binding types found
        </p>
      </div>
      {metadata && (
        <BehaviorParametersPicker
          metadata={metadata}
          param1={param1}
          param2={param2}
          layers={layers}
          onParam1Changed={setParam1}
          onParam2Changed={setParam2}
        />
      )}
    </div>
  );
};
