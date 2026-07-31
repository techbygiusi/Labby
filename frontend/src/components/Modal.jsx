import React, { useEffect } from 'react';

/**
 * Shared modal. Desktop: centered dialog with pop-in.
 * Mobile (<768px): full-width bottom sheet sliding up, with grab handle.
 * Closes on ESC and on backdrop click (unless disableBackdropClose).
 */
export default function Modal({ title, children, onClose, className = '', disableBackdropClose = false, closeLabel = 'Close' }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const handleBackdrop = (event) => {
    if (disableBackdropClose) return;
    if (event.target === event.currentTarget) onClose?.();
  };

  return (
    <div className="modal-overlay active" role="dialog" aria-modal="true" onMouseDown={handleBackdrop}>
      <div className={`modal-card ${className}`.trim()}>
        <div className="sheet-handle" aria-hidden="true"></div>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={closeLabel}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}
