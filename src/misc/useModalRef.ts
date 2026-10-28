import { MutableRefObject, useEffect, useRef } from "react";

export function useModalRef(
  open: boolean,
  closeOnOutsideClick?: boolean,
  allowCancel?: boolean
): MutableRefObject<HTMLDialogElement | null> {
  const ref = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) {
      dialog.close();
      return;
    }

    if (!dialog.open) dialog.showModal();
    const preventCancel = (event: Event) => event.preventDefault();
    const handleClickOutside = (event: MouseEvent) => {
      const { top, left, width, height } = dialog.getBoundingClientRect();
      const clickedInDialog =
        top <= event.clientY && event.clientY <= top + height &&
        left <= event.clientX && event.clientX <= left + width;
      if (!clickedInDialog) dialog.close();
    };

    if (allowCancel === false) dialog.addEventListener("cancel", preventCancel);
    if (closeOnOutsideClick) document.addEventListener("mousedown", handleClickOutside);
    return () => {
      dialog.removeEventListener("cancel", preventCancel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, closeOnOutsideClick, allowCancel]);

  return ref;
}
