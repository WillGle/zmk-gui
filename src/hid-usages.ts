// import { UsagePages } from "./HidUsageTables-1.5.json";
// Filtered with `cat src/HidUsageTables-1.5.json | jq '{ UsagePages: [.UsagePages[] | select([.Id] |inside([7, 12]))] }' > src/keyboard-and-consumer-usage-tables.json`
import { UsagePages } from "./keyboard-and-consumer-usage-tables.json";
import HidOverrides from "./hid-usage-name-overrides.json";

interface HidLabels {
  short?: string;
  med?: string;
  long?: string;
}

const overrides: Record<string, Record<string, HidLabels>> = HidOverrides;

export interface UsageId {
  Id: number;
  Name: string;
}

export interface UsagePageInfo {
  Name: string;
  UsageIds: UsageId[];
}

export const hid_usage_from_page_and_id = (page: number, id: number) =>
  (page << 16) + id;

export const hid_usage_page_and_id_from_usage = (
  usage: number
): [number, number] => [(usage >> 16) & 0xffff, usage & 0xffff];

export const hid_usage_page_get_ids = (
  usage_page: number
): UsagePageInfo | undefined => UsagePages.find((p) => p.Id === usage_page);

export const hid_usage_get_label = (
  usage_page: number,
  usage_id: number
): string | undefined =>
  overrides[usage_page.toString()]?.[usage_id.toString()]?.short ||
  UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
    (u) => u.Id === usage_id
  )?.Name;

export const hid_usage_get_labels = (
  usage_page: number,
  usage_id: number
): { short?: string; med?: string; long?: string } =>
  overrides[usage_page.toString()]?.[usage_id.toString()] || {
    short: UsagePages.find((p) => p.Id === usage_page)?.UsageIds?.find(
      (u) => u.Id === usage_id
    )?.Name,
  };

export const hid_usage_get_binding_labels = (usage: number): HidLabels => {
  const [page, id] = hid_usage_page_and_id_from_usage(usage);
  const labels = hid_usage_get_labels(page & 0xff, id);
  const modifiers = [
    ["L Ctrl", "Left Control"],
    ["L Shift", "Left Shift"],
    ["L Alt", "Left Alt"],
    ["L GUI", "Left GUI"],
    ["R Ctrl", "Right Control"],
    ["R Shift", "Right Shift"],
    ["R Alt", "Right Alt"],
    ["R GUI", "Right GUI"],
  ].filter((_, bit) => ((usage >>> 24) & (1 << bit)) !== 0);
  const withModifiers = (label: string | undefined, long = false) =>
    label
      ? [
          ...modifiers.map((m) => m[long ? 1 : 0]),
          label.replace(/^Keyboard /, ""),
        ].join(" + ")
      : undefined;

  return {
    short: withModifiers(labels.short || labels.med || labels.long),
    med: withModifiers(labels.med || labels.short || labels.long),
    long: withModifiers(labels.long || labels.med || labels.short, true),
  };
};
