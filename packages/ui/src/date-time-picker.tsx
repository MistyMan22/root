"use client";

import { forwardRef } from "react";

import { cn } from "@acme/ui";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

export interface DateTimePickerProps {
  mode: "date" | "time" | "datetime";
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

export const DateTimePicker = forwardRef<HTMLInputElement, DateTimePickerProps>(
  (
    {
      mode,
      value,
      onChange,
      label,
      placeholder,
      className,
      disabled,
      required,
      ...props
    },
    ref,
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    const getInputType = () => {
      switch (mode) {
        case "date":
          return "date";
        case "time":
          return "time";
        case "datetime":
          return "datetime-local";
        default:
          return "date";
      }
    };

    const getDefaultPlaceholder = () => {
      switch (mode) {
        case "date":
          return "Select date";
        case "time":
          return "Select time";
        case "datetime":
          return "Select date and time";
        default:
          return "";
      }
    };

    return (
      <div className="space-y-1">
        {label && (
          <Label htmlFor={props.id} className="text-xs font-medium">
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          type={getInputType()}
          value={value}
          onChange={handleChange}
          placeholder={placeholder ?? getDefaultPlaceholder()}
          disabled={disabled}
          required={required}
          className={cn("w-full", className)}
          {...props}
        />
      </div>
    );
  },
);

DateTimePicker.displayName = "DateTimePicker";
