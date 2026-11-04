"use client";

import { Toast } from "@base-ui/react/toast";
import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";

export function RunoToaster() {
  const { toasts } = Toast.useToastManager();
  const t = useTranslations("toast");
  const reduceMotion = useReducedMotion();

  return (
    <Toast.Portal className="runo-toast-portal">
      <Toast.Viewport className="runo-toast-viewport">
        {toasts.map((toast) => (
          <Toast.Root key={toast.id} toast={toast} className="runo-toast" swipeDirection={["down", "right"]}>
            <Toast.Content className="runo-toast-content">
              <motion.div
                className="runo-toast-inner"
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
              >
                <div className="runo-toast-copy">
                  <Toast.Title className="runo-toast-title" />
                  {toast.description ? <Toast.Description className="runo-toast-description" /> : null}
                </div>
                <div className="runo-toast-actions">
                  {toast.actionProps ? <Toast.Action className="runo-toast-action" /> : null}
                  <Toast.Close className="runo-toast-close" aria-label={t("close")}>
                    ×
                  </Toast.Close>
                </div>
              </motion.div>
            </Toast.Content>
          </Toast.Root>
        ))}
      </Toast.Viewport>
    </Toast.Portal>
  );
}
