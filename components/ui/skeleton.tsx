import type { ComponentProps } from "react";
import "./skeleton.css";

export function Skeleton({ className = "", ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={`runo-skeleton rounded-md bg-foreground/10 ${className}`}
      {...props}
    />
  );
}
