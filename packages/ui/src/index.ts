import { cx } from "class-variance-authority";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: Parameters<typeof cx>) => twMerge(cx(inputs));

export { DateTimePicker } from "./date-time-picker";
export type { DateTimePickerProps } from "./date-time-picker";
