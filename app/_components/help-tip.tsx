"use client";

import { Popover } from "@base-ui/react/popover";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function HelpTip({ children, label }: { children: ReactNode; label?: string }) {
  const t = useTranslations("common");

  return (
    <Popover.Root>
      <Popover.Trigger
        type="button"
        className="help-tip-button"
        aria-label={label ?? t("moreInfo")}
        openOnHover
        delay={100}
        closeDelay={100}
      >
        <span aria-hidden>i</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="help-tip-positioner"
          side="bottom"
          align="center"
          sideOffset={8}
          collisionPadding={12}
        >
          <Popover.Popup className="help-tip-panel">{children}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
