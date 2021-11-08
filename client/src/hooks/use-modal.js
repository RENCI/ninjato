import { useState } from "react";

export const useModal = (initialValue = false) => {
  const [open, setOpen] = useState(initialValue);

  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

  return [open, onOpen, onClose];
};