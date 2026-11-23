import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import './sheet.css';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Buttons pinned to the bottom of the sheet. */
  footer?: ReactNode;
}

/** Modal panel: slides up from the bottom on phones, centered dialog on wide screens. */
export function Sheet({ open, title, onClose, children, footer }: SheetProps) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effect (callers often pass a new function).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="vt-sheet">
      <div className="vt-sheet__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        className="vt-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="vt-sheet__header">
          <h2 id={titleId} className="vt-title">
            {title}
          </h2>
          <button type="button" className="vt-icon-button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" size={22} />
          </button>
        </div>
        <div className="vt-sheet__body">{children}</div>
        {footer && <div className="vt-sheet__footer">{footer}</div>}
      </div>
    </div>
  );
}
