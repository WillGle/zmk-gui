import {
  Button,
  Checkbox,
  CheckboxGroup,
  Collection,
  ComboBox,
  Header,
  Input,
  Key,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Section,
} from "react-aria-components";
import {
  hid_usage_from_page_and_id,
  hid_usage_page_get_ids,
} from "../hid-usages";
import { useCallback, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface HidUsagePage {
  id: number;
  min?: number;
  max?: number;
}

export interface HidUsagePickerProps {
  label?: string;
  value?: number;
  usagePages: HidUsagePage[];
  onValueChanged: (value?: number) => void;
}

type UsageSectionProps = HidUsagePage & { query: string };

const UsageSection = ({ id, min, max, query }: UsageSectionProps) => {
  const info = useMemo(() => hid_usage_page_get_ids(id), [id]);

  let usages = useMemo(() => {
    let usages = info?.UsageIds || [];
    if (max || min) {
      usages = usages.filter(
        (i) =>
          (i.Id <= (max || Number.MAX_SAFE_INTEGER) && i.Id >= (min || 0)) ||
          (id === 7 && i.Id >= 0xe0 && i.Id <= 0xe7)
      );
    }

    return usages.filter((usage) => usage.Name.toLowerCase().includes(query.trim().toLowerCase()));
  }, [id, min, max, info, query]);

  return (
    <Section id={id}>
      <Header className="text-base-content/50">{info?.Name}</Header>
      <Collection items={usages}>
        {(i) => (
          <ListBoxItem
            className="rac-hover:bg-base-300 pl-3 relative rac-focus:bg-base-300 cursor-default select-none rac-selected:before:content-['✔'] before:absolute before:left-[0] before:top-[0]"
            id={hid_usage_from_page_and_id(id, i.Id)}
          >
            {i.Name}
          </ListBoxItem>
        )}
      </Collection>
    </Section>
  );
};

enum Mods {
  LeftControl = 0x01,
  LeftShift = 0x02,
  LeftAlt = 0x04,
  LeftGUI = 0x08,
  RightControl = 0x10,
  RightShift = 0x20,
  RightAlt = 0x40,
  RightGUI = 0x80,
}

const mod_labels: Record<Mods, string> = {
  [Mods.LeftControl]: "L Ctrl",
  [Mods.LeftShift]: "L Shift",
  [Mods.LeftAlt]: "L Alt",
  [Mods.LeftGUI]: "L GUI",
  [Mods.RightControl]: "R Ctrl",
  [Mods.RightShift]: "R Shift",
  [Mods.RightAlt]: "R Alt",
  [Mods.RightGUI]: "R GUI",
};

const all_mods = [
  Mods.LeftControl,
  Mods.LeftShift,
  Mods.LeftAlt,
  Mods.LeftGUI,
  Mods.RightControl,
  Mods.RightShift,
  Mods.RightAlt,
  Mods.RightGUI,
];

function mods_to_flags(mods: Mods[]): number {
  return mods.reduce((a, v) => a + v, 0);
}

function mask_mods(value: number) {
  return value & ~(mods_to_flags(all_mods) << 24);
}

export const HidUsagePicker = ({
  label,
  value,
  usagePages,
  onValueChanged,
}: HidUsagePickerProps) => {
  const labelId = useId();
  const [query, setQuery] = useState("");
  const mods = useMemo(() => {
    let flags = value ? value >> 24 : 0;

    return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
  }, [value]);

  const selectionChanged = useCallback(
    (e: Key | null) => {
      let value = typeof e == "number" ? e : undefined;
      if (value !== undefined) {
        let mod_flags = mods_to_flags(mods.map((m) => parseInt(m)));
        value = value | (mod_flags << 24);
      }

      onValueChanged(value);
    },
    [onValueChanged, mods]
  );

  const modifiersChanged = useCallback(
    (m: string[]) => {
      if (!value) {
        return;
      }

      let mod_flags = mods_to_flags(m.map((m) => parseInt(m)));
      let new_value = mask_mods(value) | (mod_flags << 24);
      onValueChanged(new_value);
    },
    [value]
  );

  return (
    <div className="flex flex-wrap gap-3 relative items-center">
      {label && <Label id={labelId}>{label}:</Label>}
      <ComboBox
        selectedKey={value ? mask_mods(value) : null}
        onSelectionChange={selectionChanged}
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : "Key or media binding"}
        onInputChange={setQuery}
        onOpenChange={(open) => { if (!open) setQuery(""); }}
      >
        <div className="flex">
          <Input placeholder="Search keys or media…" className="h-10 p-2 rounded-l bg-base-100" />
          <Button aria-label="Show keys and media" className="rounded-r bg-primary text-primary-content w-10 h-10 flex justify-center items-center">
            <ChevronDown className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <Popover className="w-[var(--trigger-width)] shadow-md text-base-content rounded border-base-content bg-base-100">
          <ListBox
            items={usagePages}
            className="block max-h-[30vh] min-h-[unset] overflow-auto p-2"
            selectionMode="single"
          >
            {({ id, min, max }) => <UsageSection id={id} min={min} max={max} query={query} />}
          </ListBox>
        </Popover>
      </ComboBox>
      <CheckboxGroup
        aria-label="Implicit Modifiers"
        className="flex flex-wrap gap-1 rounded-md"
        value={mods}
        onChange={modifiersChanged}
      >
        {all_mods.map((m) => (
          <Checkbox
            key={m}
            value={m.toLocaleString()}
            className="text-nowrap cursor-pointer grid px-2 min-h-10 content-center justify-center rac-selected:bg-primary border-base-100 bg-base-300 hover:bg-base-100 first:rounded-s-md last:rounded-e-md rac-selected:text-primary-content"
          >
            {mod_labels[m]}
          </Checkbox>
        ))}
      </CheckboxGroup>
    </div>
  );
};
