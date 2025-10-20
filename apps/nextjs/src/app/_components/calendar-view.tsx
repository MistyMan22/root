"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { toast } from "@acme/ui/toast";

import type { CreatableSelectOption } from "./creatable-select";
import { useTRPC } from "~/trpc/react";
import { BaseModal } from "./base-modal";
import { CreatableSelect } from "./creatable-select";

// Interface for task list data
interface TaskList {
  id: string;
  data: {
    name: string;
    description: string;
  };
}

// import { CreateTodoForm, TodoCard } from "./todos";

type Todo = RouterOutputs["todo"]["all"][number];
interface Session {
  startTimeDate?: string;
  time?: string | null;
  duration?: number | null;
  status: "completed" | "planned" | "skipped";
  notes: string;
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
            {session.notes && (
              <>
                {session.notes}
                {(session.time ?? session.duration) && (
                  <span className="ml-2 font-medium">•</span>
                )}
              </>
            )}
            {session.time && session.duration && (
              <span className="ml-2 font-medium">
                {formatTime(session.time)} -{" "}
                {calculateEndTime(session.time, session.duration)}
              </span>
            )}
            {session.time && !session.duration && (
              <span className="ml-2 font-medium">
                {formatTime(session.time)}
              </span>
            )}
            {!session.time && session.duration && (
              <span className="ml-2 font-medium">
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

// Custom form component for calendar view that handles submission and closes modal
function CalendarTaskForm({
  dateString,
  onSuccess,
  initialFocusRef,
}: {
  dateString: string;
  onSuccess: () => void;
  initialFocusRef: React.RefObject<HTMLInputElement | null>;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [listId, setListId] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [status, setStatus] = useState<"planned" | "completed" | "skipped">(
    "planned",
  );
  const [notes, setNotes] = useState("");

  // Get task lists for the select
  const { data: taskLists = [] } = useSuspenseQuery(
    trpc.taskList.all.queryOptions(),
  ) as { data: TaskList[] };

  // Convert task lists to options format
  const listOptions: CreatableSelectOption[] = [
    { value: "__none__", label: "No list" },
    ...taskLists.map((list: TaskList) => ({
      value: list.id,
      label: list.data.name || "Unnamed List",
    })),
  ];

  const handleCreateNewList = async (name: string) => {
    try {
      const newList = (await trpc.taskList.create.mutate({
        name: name.trim(),
        description: "",
      })) as TaskList;
      setListId(newList.id);
    } catch (error) {
      console.error("Failed to create list:", error);
    }
  };

  const createTodo = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
        onSuccess();
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create todos"
            : "Failed to create todo",
        );
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const session = {
      startTimeDate: dateString,
      time: time ?? null,
      duration: duration ?? null,
      status,
      notes,
    };

    createTodo.mutate({
      title,
      description,
      sessions: [session],
      listId: listId === "__none__" ? undefined : listId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details, notes, or context..."
          rows={4}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-base placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="space-y-2">
        <CreatableSelect
          value={listId}
          onChange={(value) =>
            setListId(value === "__none__" ? "" : (value ?? ""))
          }
          options={listOptions}
          onCreateNew={handleCreateNewList}
          placeholder="Select a list..."
          label="List"
        />
      </div>

      <div className="border-t pt-4">
        <div className="mb-3">
          <h3 className="text-base font-medium text-gray-900">Sessions (1)</h3>
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
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
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
                  value={duration ?? ""}
                  onChange={(e) =>
                    setDuration(
                      e.target.value ? parseInt(e.target.value) : null,
                    )
                  }
                  placeholder="60"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(
                      e.target.value as "planned" | "completed" | "skipped",
                    )
                  }
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                >
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add session notes..."
                rows={2}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <Button
          type="submit"
          className="w-full py-3 text-base"
          disabled={createTodo.isPending}
        >
          {createTodo.isPending ? "Adding..." : "Add Task"}
        </Button>
      </div>
    </form>
  );
}

// Add Task button component that pre-populates with a specific date
function AddTaskButton({ dateString }: { dateString: string }) {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

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
        <CalendarTaskForm
          dateString={dateString}
          onSuccess={() => setOpen(false)}
          initialFocusRef={initialFocusRef}
        />
      </BaseModal>
    </>
  );
}

export function CalendarView() {
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  // const router = useRouter();

  const listId = searchParams.get("list") ?? undefined;
  const { data: todos } = useSuspenseQuery(
    trpc.todo.all.queryOptions(listId ? { listId } : undefined),
  );
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Group tasks by date
  const tasksByDate = new Map<string, TaskWithSession[]>();

  todos.forEach((todo) => {
    const sessions = todo.data.sessions ?? [];

    sessions.forEach((session) => {
      if (!session.startTimeDate) return;

      const sessionDate = session.startTimeDate;
      const [year, month, day] = sessionDate.split("-");
      if (!year || !month || !day) return;

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

  // Always include today and tomorrow, even if no tasks exist
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  // Ensure today and tomorrow are always in the map
  if (!tasksByDate.has(todayString)) {
    tasksByDate.set(todayString, []);
  }
  if (!tasksByDate.has(tomorrowString)) {
    tasksByDate.set(tomorrowString, []);
  }

  // Sort dates
  const sortedDates = Array.from(tasksByDate.keys()).sort();

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    if (!year || !month || !day) return dateString;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

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
        const tasks = tasksByDate.get(dateString) ?? [];

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
