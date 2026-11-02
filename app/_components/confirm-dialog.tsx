"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { useTranslations } from "next-intl";

/**
 * Shared confirmation modal. Corrections keep a cancel path, so a confirm never
 * becomes the only way out. Use `tone="danger"` only for actions that remove
 * something; neutral corrections stay on the primary tone.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  note = null,
  confirmLabel,
  onConfirm,
  tone = "primary",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  note?: string | null;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "primary" | "danger";
}) {
  const common = useTranslations("common");

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal className="runo-dialog-portal">
        <AlertDialog.Backdrop className="runo-dialog-backdrop" />
        <AlertDialog.Popup className="runo-dialog">
          <AlertDialog.Title className="runo-dialog-title">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="runo-dialog-copy">
            {description}
            {note ? (
              <span className="runo-dialog-note">
                {" "}
                {note}
              </span>
            ) : null}
          </AlertDialog.Description>
          <div className="runo-dialog-actions">
            <AlertDialog.Close className="runo-dialog-cancel">
              {common("cancel")}
            </AlertDialog.Close>
            <AlertDialog.Close
              className={tone === "danger" ? "runo-dialog-danger" : "runo-dialog-confirm"}
              onClick={onConfirm}
            >
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
