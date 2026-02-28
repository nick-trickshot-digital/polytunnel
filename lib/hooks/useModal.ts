import { useEffect, useRef } from 'react';

/**
 * Shared hook for modal/panel behaviour:
 * - Escape key to close
 * - Body scroll lock while open
 *
 * Uses a reference counter so nested modals don't
 * accidentally restore scroll while a parent is still open.
 */
let openCount = 0;

export function useModal(onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    openCount++;
    if (openCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      openCount--;
      if (openCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, []); // stable — no deps, onClose accessed via ref
}
