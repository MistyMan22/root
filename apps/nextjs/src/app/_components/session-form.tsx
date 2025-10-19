"use client";

import { useState } from "react";

import { DateTimePicker } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Input } from "@acme/ui/input";
import { Label } from "@acme/ui/label";

export interface Session {
  startTimeDate?: string;
  time?: string | null;
  duration?: number | null;
  status: "completed" | "planned" | "skipped";
  notes: string;
}

interface SessionFormProps {
  initial?: Partial<Session>;
  onSubmit: (session: Session) => void;
  onCancel?: () => void;
  submitLabel?: string;
  pending?: boolean;
  quickMode?: boolean;
}

export function SessionForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Save Session",
  pending = false,
  quickMode = false,
}: SessionFormProps) {
  const [isDetailed, setIsDetailed] = useState(!quickMode);
  const [formData, setFormData] = useState<Session>({
    startTimeDate: initial?.startTimeDate ?? "",
    time: initial?.time ?? null,
    duration: initial?.duration ?? null,
    status: initial?.status ?? "planned",
    notes: initial?.notes ?? "",
  });

  const handleSubmit = () => {
    // Only auto-set status if user hasn't manually changed it from the default
    let finalStatus = formData.status;

    // If status is still the default "planned", auto-detect based on date/time
    if (formData.status === "planned") {
      if (formData.startTimeDate) {
        const [year, month, day] = formData.startTimeDate.split("-");
        if (year && month && day) {
          const sessionDate = new Date(
            parseInt(year),
            parseInt(month) - 1,
            parseInt(day),
          );

          if (formData.time) {
            const [hours, minutes] = formData.time.split(":");
            if (hours && minutes) {
              sessionDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            }
          } else {
            sessionDate.setHours(23, 59, 59, 999); // End of day
          }

          const now = new Date();
          finalStatus = sessionDate < now ? "completed" : "planned";
        }
      }
    }

    const sessionData: Session = {
      ...formData,
      status: finalStatus,
    };

    onSubmit(sessionData);
  };

  const handleDateChange = (date: string) => {
    setFormData((prev) => ({ ...prev, startTimeDate: date }));
  };

  const handleTimeChange = (time: string) => {
    setFormData((prev) => ({ ...prev, time: time || null }));
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      duration: value ? parseInt(value, 10) : null,
    }));
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, notes: e.target.value }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      status: e.target.value as "completed" | "planned" | "skipped",
    }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <DateTimePicker
          mode="date"
          label="Date"
          value={formData.startTimeDate}
          onChange={handleDateChange}
          required
        />

        {isDetailed && (
          <>
            <DateTimePicker
              mode="time"
              label="Time (optional)"
              value={formData.time ?? ""}
              onChange={handleTimeChange}
            />

            <div className="space-y-1">
              <Label htmlFor="duration" className="text-xs font-medium">
                Duration (minutes, optional)
              </Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration ?? ""}
                onChange={handleDurationChange}
                placeholder="e.g., 60"
                min="0"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="status" className="text-xs font-medium">
                Status
              </Label>
              <select
                id="status"
                value={formData.status}
                onChange={handleStatusChange}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs font-medium">
                Notes (optional)
              </Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={handleNotesChange}
                placeholder="Add any notes..."
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDetailed(!isDetailed)}
          >
            {isDetailed ? "Quick Mode" : "Detailed Mode"}
          </Button>
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
