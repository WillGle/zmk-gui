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

  const matchingSet = metadata.find((s) =>
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

  const applyBinding = (nextBehaviorId: number, nextParam1?: number, nextParam2?: number) => {
    const nextMetadata = behaviors.find((behavior) => behavior.id === nextBehaviorId)?.metadata;
    if (nextMetadata && validateBinding(nextMetadata, layers.map(({ id }) => id), nextParam1, nextParam2)) {
      onBindingChanged({ behaviorId: nextBehaviorId, param1: nextParam1 || 0, param2: nextParam2 || 0 });
    }
  };

  useEffect(() => {
    setBehaviorId(binding.behaviorId);
    setParam1(binding.param1);
    setParam2(binding.param2);
  }, [binding]);

  return (
    <div className="flex flex-col gap-5 max-w-5xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-base-content/20 bg-base-100 p-4">
        <div className="flex flex-col gap-2 min-w-0">
          <label className="font-semibold" htmlFor={searchId}>Find binding</label>
          <input
            id={searchId}
            type="search"
            placeholder="Search binding types…"
            className="h-11 rounded-lg px-3 w-full bg-base-200 border border-base-content/30 placeholder:text-base-content/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <label className="font-semibold" htmlFor={behaviorSelectId}>Binding type</label>
          <select
            id={behaviorSelectId}
            value={behaviorId}
            className="h-11 rounded-lg px-3 w-full bg-base-200 border border-base-content/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            onChange={(e) => {
              const nextBehaviorId = parseInt(e.target.value);
              setBehaviorId(nextBehaviorId);
              setParam1(0);
              setParam2(0);
              applyBinding(nextBehaviorId, 0, 0);
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
        <p className="sm:col-span-2 text-sm" role="status">
          {filteredBehaviors.length} binding types found
        </p>
      </div>
      {metadata && (
        <BehaviorParametersPicker
          metadata={metadata}
          param1={param1}
          param2={param2}
          layers={layers}
          onParam1Changed={(value) => {
            setParam1(value);
            applyBinding(behaviorId, value, param2);
          }}
          onParam2Changed={(value) => {
            setParam2(value);
            applyBinding(behaviorId, param1, value);
          }}
        />
      )}
    </div>
  );
};
