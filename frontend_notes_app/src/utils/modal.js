import { useEffect } from 'react';

let modalCount = 0;

const apply = () => {
  const open = modalCount > 0;
  document.body.dataset.modalOpen = open ? '1' : '0';
};

export const useModalFlag = (open) => {
  useEffect(() => {
    if (!open) return undefined;
    modalCount += 1;
    apply();
    return () => {
      modalCount = Math.max(0, modalCount - 1);
      apply();
    };
  }, [open]);
};

