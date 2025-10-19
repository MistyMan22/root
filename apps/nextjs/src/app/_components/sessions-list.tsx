"use client";

import { useState } from "react";

import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import type { Session } from "./session-form";
import { SessionForm } from "./session-form";

interface SessionsListProps {
  sessions: Session[];
  onUpdateSession: (index: number, session: Session) => void;
  onDeleteSession: (index: number) => void;
  onAddSession: (session: Session) => void;
  pending?: boolean;
  readOnly?: boolean;
}

export function SessionsList({
  sessions,
  onUpdateSession,
  onDeleteSession,
  onAddSession,
  pending = false,
  readOnly = false,
}: SessionsListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
  };

  const handleAdd = () => {
    // Auto-add a session with today's date (local timezone)
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const newSession: Session = {
      startTimeDate: todayString,
      time: null,
      duration: null,
      status: "planned",
      notes: "",
    };
    onAddSession(newSession);
  };

  const handleSave = (session: Session) => {
    if (editingIndex !== null) {
      onUpdateSession(editingIndex, session);
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split("-");
    if (year && month && day) {
      const localDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );
      return localDate.toLocaleDateString();
    }
    return "Invalid date";
  };

  const formatTime = (timeString?: string | null) => {
    if (!timeString) return "";
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (duration?: number | null) => {
    if (!duration) return "";
    if (duration < 60) return `${duration}m`;
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getStatusBadge = (status: Session["status"]) => {
    const baseClasses =
      "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";

    switch (status) {
      case "completed":
        return cn(baseClasses, "bg-green-100 text-green-800");
      case "planned":
        return cn(baseClasses, "bg-blue-100 text-blue-800");
      case "skipped":
        return cn(baseClasses, "bg-gray-100 text-gray-800");
      default:
        return cn(baseClasses, "bg-gray-100 text-gray-800");
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="space-y-3">
        <div className="py-4 text-center">
          <p className="text-sm text-gray-500">No sessions yet</p>
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdd}
              className="mt-2"
              disabled={pending}
            >
              Add Session
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add Session Button */}
      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={pending}
          className="w-full"
        >
          Add Session
        </Button>
      )}

      {/* Sessions List */}
      <div className="space-y-2">
        {sessions.map((session, index) => (
          <div key={index} className="rounded-md border p-3">
            {editingIndex === index ? (
              <SessionForm
                initial={session}
                onSubmit={handleSave}
                onCancel={handleCancel}
                submitLabel="Update Session"
                pending={pending}
              />
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatDate(session.startTimeDate)}
                    </span>
                    {session.time && (
                      <span className="text-sm text-gray-500">
                        at {formatTime(session.time)}
                      </span>
                    )}
                    {session.duration && (
                      <span className="text-sm text-gray-500">
                        ({formatDuration(session.duration)})
                      </span>
                    )}
                  </div>
                  <span className={getStatusBadge(session.status)}>
                    {session.status}
                  </span>
                </div>

                {session.notes && (
                  <p className="text-sm text-gray-600">{session.notes}</p>
                )}

                {!readOnly && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(index)}
                      disabled={pending}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteSession(index)}
                      disabled={pending}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
