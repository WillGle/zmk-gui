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

  const usages = useMemo(() => {
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
    const flags = value ? value >> 24 : 0;

    return all_mods.filter((m) => m & flags).map((m) => m.toLocaleString());
  }, [value]);

  const selectionChanged = useCallback(
    (e: Key | null) => {
      let value = typeof e == "number" ? e : undefined;
      if (value !== undefined) {
        const mod_flags = mods_to_flags(mods.map((m) => parseInt(m)));
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

      const mod_flags = mods_to_flags(m.map((m) => parseInt(m)));
      const new_value = mask_mods(value) | (mod_flags << 24);
      onValueChanged(new_value);
    },
    [value, onValueChanged]
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)] gap-5 rounded-xl border border-base-content/20 bg-base-100 p-4">
      <div className="flex flex-col gap-2 min-w-0">
        <Label id={labelId} className="font-semibold">{label || "Key or media binding"}</Label>
        <ComboBox
          selectedKey={value ? mask_mods(value) : null}
          onSelectionChange={selectionChanged}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : "Key or media binding"}
          onInputChange={setQuery}
          onOpenChange={(open) => { if (!open) setQuery(""); }}
        >
          <div className="flex">
            <Input placeholder="Search keys or media…" className="h-11 px-3 rounded-l-lg bg-base-200 border border-base-content/30 min-w-0 w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent" />
            <Button aria-label="Show keys and media" className="rounded-r-lg bg-primary text-primary-content w-11 h-11 shrink-0 flex justify-center items-center rac-focus-visible:outline rac-focus-visible:outline-2 rac-focus-visible:outline-accent">
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
        <p className="text-sm">Type a key or media name to search.</p>
      </div>
      <CheckboxGroup
        aria-label="Implicit Modifiers"
        className="flex flex-col gap-2 min-w-0"
        value={mods}
        onChange={modifiersChanged}
      >
        <Label className="font-semibold">Modifiers <span className="font-normal text-sm">(optional)</span></Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {all_mods.map((m) => (
            <Checkbox
              key={m}
              value={m.toLocaleString()}
              className="cursor-pointer flex items-center justify-center gap-2 px-2 min-h-11 rounded-lg border border-base-content/30 bg-base-200 hover:border-primary rac-selected:bg-primary rac-selected:text-primary-content rac-selected:border-primary rac-focus-visible:outline rac-focus-visible:outline-2 rac-focus-visible:outline-offset-2 rac-focus-visible:outline-accent"
            >
              {({ isSelected }) => <><span aria-hidden="true" className="w-4 text-center">{isSelected ? "✓" : "+"}</span>{mod_labels[m]}</>}
            </Checkbox>
          ))}
        </div>
        <p className="text-sm">Highlighted modifiers are included in the binding.</p>
      </CheckboxGroup>
    </div>
  );
};
