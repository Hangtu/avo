"use client";

import { Select } from "@base-ui/react/select";

export interface SelectOption {
  value: string;
  label: string;
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="select-chevron"
    >
      <path
        d="m5 8 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="select-check"
    >
      <path
        d="m4 10 4 4 8-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SelectControl({
  value,
  options,
  onChange,
  label,
  disabled = false,
  inline = false,
  id,
  invalid = false,
  describedBy,
}: {
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  inline?: boolean;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className={inline ? "select-control select-control-inline" : "select-control"}>
      <Select.Root
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next !== null) onChange(next);
        }}
        disabled={disabled}
      >
        <Select.Trigger
          type="button"
          id={id}
          className="select-trigger"
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
        >
          <Select.Value />
          <Select.Icon>
            <ChevronIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner className="select-positioner" sideOffset={6} align="start">
            <Select.Popup className="select-popup">
              <Select.List className="select-list">
                {options.map((option) => (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="select-item"
                  >
                    <Select.ItemIndicator className="select-item-indicator">
                      <CheckIcon />
                    </Select.ItemIndicator>
                    <Select.ItemText>{option.label}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
