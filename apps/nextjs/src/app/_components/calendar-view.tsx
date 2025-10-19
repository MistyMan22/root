"use client";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";

import { TodoCard } from "./todos";

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

export function CalendarView({ todos }: CalendarViewProps) {
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

  const formatSessionTime = (session: Session) => {
    const parts = [];

    if (session.time) {
      const time = new Date(`2000-01-01T${session.time}`).toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      );
      parts.push(time);
    }

    if (session.duration) {
      if (session.duration < 60) {
        parts.push(`${session.duration}m`);
      } else {
        const hours = Math.floor(session.duration / 60);
        const minutes = session.duration % 60;
        parts.push(minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`);
      }
    }

    return parts.length > 0 ? ` • ${parts.join(" ")}` : "";
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
            <h3 className="text-lg font-semibold text-gray-900">
              {formatDate(dateString)}
            </h3>

            <div className="space-y-2">
              {tasks.map(({ todo, session }, index) => (
                <div
                  key={`${todo.id}-${index}`}
                  className="rounded-lg border bg-gray-50 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {typeof todo.data.title === "string"
                          ? todo.data.title
                          : "Untitled"}
                      </h4>
                      <p className="mt-1 text-sm text-gray-600">
                        {session.notes || "No notes"}
                        {formatSessionTime(session)}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={getStatusBadge(session.status)}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
