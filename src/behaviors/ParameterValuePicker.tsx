import { useId } from "react";
import { BehaviorParameterValueDescription } from "@zmkfirmware/zmk-studio-ts-client/behaviors";
import { HidUsagePicker } from "./HidUsagePicker";

export interface ParameterValuePickerProps {
  label?: string;
  value?: number;
  values: BehaviorParameterValueDescription[];
  layers: { id: number; name: string }[];
  onValueChanged: (value?: number) => void;
}

export const ParameterValuePicker = ({
  label = "Parameter",
  value,
  values,
  layers,
  onValueChanged,
}: ParameterValuePickerProps) => {
  const inputId = useId();
  const inputLabel = `${label}: ${values.map((v) => v.name).join(" / ")}`;
  if (values.length == 0) {
    return <></>;
  } else if (values.every((v) => v.constant !== undefined)) {
    return (
      <div>
        <label htmlFor={inputId}>{label}: </label>
        <select
          id={inputId}
          value={values.some((v) => v.constant === value) ? value : ""}
          className="h-8 rounded"
          onChange={(e) => onValueChanged(parseInt(e.target.value))}
        >
          <option value="" disabled>Choose a value…</option>
          {values.map((v) => (
            <option key={v.constant} value={v.constant}>{v.name}</option>
          ))}
        </select>
      </div>
    );
  } else if (values.length == 1) {
    if (values[0].range) {
      return (
        <div>
          <label htmlFor={inputId}>{inputLabel}: </label>
          <input
            id={inputId}
            type="number"
            min={values[0].range.min}
            max={values[0].range.max}
            value={value ?? ""}
            onChange={(e) => onValueChanged(e.target.value === "" ? undefined : parseInt(e.target.value))}
          />
        </div>
      );
    } else if (values[0].hidUsage) {
      return (
        <HidUsagePicker
          onValueChanged={onValueChanged}
          label={inputLabel}
          value={value}
          usagePages={[
            { id: 7, min: 4, max: values[0].hidUsage.keyboardMax },
            { id: 12, max: values[0].hidUsage.consumerMax },
          ]}
        />
      );
    } else if (values[0].layerId) {
      return (
        <div>
          <label htmlFor={inputId}>{inputLabel}: </label>
          <select
            id={inputId}
            value={layers.some((l) => l.id === value) ? value : ""}
            className="h-8 rounded"
            onChange={(e) => onValueChanged(parseInt(e.target.value))}
          >
            <option value="" disabled>Choose a layer…</option>
            {layers.map(({ name, id }) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      );
    }
  } else {
    console.log("Not sure how to handle", values);
    return (
      <>
        <p>Some composite?</p>
      </>
    );
  }

  return <></>;
};
