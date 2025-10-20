"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";

import { BaseModal } from "./base-modal";
import { CreateTodoForm, TodoCard } from "./todos";

type Todo = RouterOutputs["todo"]["all"][number];
type Session = {
  startTimeDate?: string;
  time?: string | null;
  duration?: number | null;
  status: "completed" | "planned" | "skipped";
  notes: string;
};

interface CalendarViewProps {
  todos: Todo[];
}

interface TaskWithSession {
  todo: Todo;
  session: Session;
}

// Custom TodoCard for calendar view that shows start/end times
function CalendarTodoCard({ todo, session }: { todo: Todo; session: Session }) {
  const router = useRouter();

  const formatTime = (timeString: string) => {
    const time = new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return time;
  };

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    return end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: Session["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "planned":
        return "bg-blue-100 text-blue-800";
      case "skipped":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div
      className="cursor-pointer rounded-lg border bg-gray-50 p-3 transition-colors hover:bg-gray-100"
      onClick={() => router.push(`/task/${todo.id}`)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 hover:text-blue-600 hover:underline">
            {typeof todo.data.title === "string" ? todo.data.title : "Untitled"}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            {session.notes || "No notes"}
            {session.time && session.duration && (
              <span className="ml-2 font-medium">
                • {formatTime(session.time)} -{" "}
                {calculateEndTime(session.time, session.duration)}
              </span>
            )}
            {session.time && !session.duration && (
              <span className="ml-2 font-medium">
                • {formatTime(session.time)}
              </span>
            )}
            {!session.time && session.duration && (
              <span className="ml-2 font-medium">
                •{" "}
                {session.duration < 60
                  ? `${session.duration}m`
                  : `${Math.floor(session.duration / 60)}h ${session.duration % 60}m`}
              </span>
            )}
          </p>
        </div>
        <div className="ml-4">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium",
              getStatusColor(session.status),
            )}
          >
            {session.status}
          </span>
        </div>
      </div>
    </div>
  );
}

// Add Task button component that pre-populates with a specific date
function AddTaskButton({ dateString }: { dateString: string }) {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);

  // Create a pre-populated form with a session on the specific date
  const prePopulatedForm = () => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="todo-title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            ref={initialFocusRef}
            id="todo-title"
            name="title"
            placeholder="What needs to be done?"
            required
            autoFocus
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="todo-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="todo-description"
            name="description"
            placeholder="Add details, notes, or context..."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="border-t pt-4">
          <div className="mb-3">
            <h3 className="text-base font-medium text-gray-900">
              Sessions (1)
            </h3>
          </div>
          <div className="rounded-lg border bg-gray-50 p-3">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Date
                  </label>
                  <input
                    type="date"
                    value={dateString}
                    readOnly
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Time
                  </label>
                  <input
                    type="time"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    placeholder="60"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Status
                  </label>
                  <select className="w-full rounded border border-gray-300 px-2 py-1 text-sm">
                    <option value="planned">Planned</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  placeholder="Add session notes..."
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <Button type="submit" className="w-full py-3 text-base">
            Add Task
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="cursor-pointer text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        onClick={() => setOpen(true)}
      >
        + Add
      </Button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        {prePopulatedForm()}
      </BaseModal>
    </>
  );
}

export function CalendarView({ todos }: CalendarViewProps) {
  const router = useRouter();
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Group tasks by date
  const tasksByDate = new Map<string, TaskWithSession[]>();

  todos.forEach((todo) => {
    const sessions = todo.data.sessions || [];

    sessions.forEach((session) => {
      if (!session.startTimeDate) return;

      const sessionDate = session.startTimeDate;
      const [year, month, day] = sessionDate.split("-");
      const sessionDateObj = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
      );

      // Only include future dates and today (normalize to start of day for comparison)
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      sessionDateObj.setHours(0, 0, 0, 0);

      if (sessionDateObj >= todayStart) {
        if (!tasksByDate.has(sessionDate)) {
          tasksByDate.set(sessionDate, []);
        }
        const dateSessions = tasksByDate.get(sessionDate);
        if (dateSessions) {
          dateSessions.push({ todo, session });
        }
      }
    });
  });

  // Sort dates
  const sortedDates = Array.from(tasksByDate.keys()).sort();

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    if (dateString === todayString) {
      return "Today";
    } else if (dateString === tomorrowString) {
      return "Tomorrow";
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
  };

  if (sortedDates.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No upcoming sessions scheduled</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateString) => {
        const tasks = tasksByDate.get(dateString) || [];

        return (
          <div key={dateString} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatDate(dateString)}
              </h3>
              <AddTaskButton dateString={dateString} />
            </div>

            <div className="space-y-2">
              {tasks
                .sort((a, b) => {
                  const aCompleted = a.todo.data.completed === true;
                  const bCompleted = b.todo.data.completed === true;

                  // If both have same completion status, maintain original order
                  if (aCompleted === bCompleted) return 0;

                  // Incomplete tasks come first
                  return aCompleted ? 1 : -1;
                })
                .map(({ todo, session }, index) => (
                  <CalendarTodoCard
                    key={`${todo.id}-${index}`}
                    todo={todo}
                    session={session}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
