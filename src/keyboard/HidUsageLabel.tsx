import { hid_usage_get_binding_labels } from "../hid-usages";

export interface HidUsageLabelProps {
  hid_usage: number;
}

export const HidUsageLabel = ({ hid_usage }: HidUsageLabelProps) => {
  const labels = hid_usage_get_binding_labels(hid_usage);

  return (
    <span
      className="@[10em]:before:content-[attr(data-long-content)] @[6em]:before:content-[attr(data-med-content)] before:content-[attr(aria-label)]"
      aria-label={labels.short}
      data-med-content={labels.med}
      data-long-content={labels.long}
    />
  );
};
