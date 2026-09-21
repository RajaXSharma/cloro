'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * The app's replacement for `window.confirm` / `window.prompt`. A native
 * `<dialog>` so the top layer, backdrop, Esc and focus trapping come for free,
 * styled with the same tokens as ShareDialog instead of the browser's own chrome.
 * Pass `children` for an input (see VersionPanel's save); the form submits on
 * Enter. Cancel takes focus when there is nothing to type in: the safe choice for
 * a destructive action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  destructive = true,
  busy = false,
  children,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(e) => {
        e.preventDefault(); // let the parent own `open`, so state cannot drift
        onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onCancel(); // backdrop / padding click
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-popover p-5 text-popover-foreground shadow-2xl backdrop:bg-black/60"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id={descriptionId} className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            autoFocus={!children}
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={destructive ? 'destructive' : 'default'}
            size="sm"
            disabled={busy}
          >
            {busy ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
