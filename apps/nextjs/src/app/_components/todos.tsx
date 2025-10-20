"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import type { RouterOutputs } from "@acme/api";
import { cn } from "@acme/ui";
import { Button } from "@acme/ui/button";
import { Checkbox } from "@acme/ui/checkbox";
// Simplified form – not using Field primitives for now
import { Input } from "@acme/ui/input";
import { toast } from "@acme/ui/toast";

import type { CreatableSelectOption } from "./creatable-select";
import type { Session } from "./session-form";
import { useTRPC } from "~/trpc/react";
import { BaseModal } from "./base-modal";
import { CreatableSelect } from "./creatable-select";
import { SessionsList } from "./sessions-list";

// Interface for task list data
interface TaskList {
  id: string;
  data: {
    name: string;
    description: string;
  };
}

function TodoForm(props: {
  initial?: {
    title: string;
    description?: string;
    sessions?: Session[];
    listId?: string;
  };
  onSubmit: (values: {
    title: string;
    description?: string;
    sessions?: Session[];
    listId?: string;
  }) => void;
  submitLabel?: string;
  pending?: boolean;
  initialFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const {
    initial = { title: "", description: "", sessions: [], listId: "" },
    onSubmit,
    submitLabel = "Save",
    pending,
    initialFocusRef,
  } = props;
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [listId, setListId] = useState(initial.listId ?? "");
  const [sessions, setSessions] = useState<Session[]>(() => {
    // If no sessions provided, create a default session for today
    if (!initial.sessions || initial.sessions.length === 0) {
      const today = new Date();
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return [
        {
          startTimeDate: todayString,
          time: null,
          duration: null,
          status: "planned",
          notes: "",
        },
      ];
    }
    return initial.sessions;
  });

  // Get task lists for the select
  const trpc = useTRPC();
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
    const newList = (await trpc.taskList.create.mutate({
      name: name.trim(),
      description: "",
    })) as TaskList;
    setListId(newList.id);
    return newList.id;
  };

  // Focus the input when component mounts
  useEffect(() => {
    const focusInput = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      }
    };

    // Small delay to ensure the input is rendered
    const timeoutId = setTimeout(focusInput, 100);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddSession = (session: Session) => {
    setSessions((prev) => [...prev, session]);
  };

  const handleUpdateSession = (index: number, session: Session) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? session : s)));
  };

  const handleDeleteSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title,
          description,
          sessions,
          listId: listId === "__none__" ? undefined : listId || undefined,
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="todo-title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <Input
            ref={initialFocusRef}
            id="todo-title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            required
            autoFocus
            className="text-base" // Prevent zoom on iOS
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

        {/* Sessions Section */}
        <div className="border-t pt-4">
          <div className="mb-3">
            <h3 className="text-base font-medium text-gray-900">
              Sessions ({sessions.length})
            </h3>
          </div>

          <SessionsList
            sessions={sessions}
            onUpdateSession={handleUpdateSession}
            onDeleteSession={handleDeleteSession}
            onAddSession={handleAddSession}
            pending={pending}
          />
        </div>
      </div>

      {/* Button at bottom */}
      <div className="border-t pt-4">
        <Button
          type="submit"
          disabled={pending}
          className="w-full py-3 text-base"
        >
          {pending ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function CreateTodoForm({ onSuccess }: { onSuccess?: () => void }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const createTodo = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
        onSuccess?.();
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

  return (
    <TodoForm
      initial={{ title: "", description: "", sessions: [] }}
      onSubmit={(values) => createTodo.mutate(values)}
      submitLabel="Add Task"
      pending={createTodo.isPending}
      initialFocusRef={initialFocusRef}
    />
  );
}

export function AddTodoButton() {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="outline"
        size="sm"
        className="border-black text-black"
        onClick={() => setOpen(true)}
      >
        Add Task
      </Button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <CreateTodoForm onSuccess={() => setOpen(false)} />
      </BaseModal>
    </div>
  );
}

type Todo = RouterOutputs["todo"]["all"][number];

export function TodoCard(props: { todo: Todo; showSessions?: boolean }) {
  console.log("🔍 Todo card props:", props);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const initialFocusRef = useRef<HTMLInputElement | null>(null);

  const updateTodo = useMutation(
    trpc.todo.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to update todos"
            : "Failed to update todo",
        );
      },
    }),
  );

  const deleteTodo = useMutation(
    trpc.todo.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.todo.pathFilter());
      },
      onError: (err) => {
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to delete todos"
            : "Failed to delete todo",
        );
      },
    }),
  );

  const handleToggleComplete = () => {
    updateTodo.mutate({
      id: props.todo.id,
      completed: !props.todo.data.completed,
    });
  };

  const formatSessionSummary = (sessions: Session[]) => {
    if (sessions.length === 0) return null;

    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // Group sessions by date
    const sessionsByDate = new Map<string, Session[]>();
    sessions.forEach((session) => {
      if (!session.startTimeDate) return;
      const sessionDate = session.startTimeDate;
      if (sessionDate) {
        if (!sessionsByDate.has(sessionDate)) {
          sessionsByDate.set(sessionDate, []);
        }
        const dateSessions = sessionsByDate.get(sessionDate);
        if (dateSessions) {
          dateSessions.push(session);
        }
      }
    });

    // Sort dates
    const sortedDates = Array.from(sessionsByDate.keys()).sort();

    const formatDate = (dateString: string) => {
      if (dateString === todayString) return "Today";
      const date = new Date(dateString);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowString = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
      if (dateString === tomorrowString) return "Tomorrow";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    };

    const getStatusColor = (status: Session["status"]) => {
      switch (status) {
        case "completed":
          return "text-green-600";
        case "planned":
          return "text-blue-600";
        case "skipped":
          return "text-gray-500";
        default:
          return "text-gray-500";
      }
    };

    return (
      <div className="mt-2 space-y-1">
        {sortedDates.slice(0, 3).map((dateString) => {
          const dateSessions = sessionsByDate.get(dateString) ?? [];
          const statusCounts = dateSessions.reduce(
            (acc, session) => {
              acc[session.status] = (acc[session.status] ?? 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          return (
            <div key={dateString} className="flex items-center gap-2 text-xs">
              <span className="font-medium text-gray-600">
                {formatDate(dateString)}
              </span>
              <div className="flex gap-1">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <span
                    key={status}
                    className={cn(
                      "font-medium",
                      getStatusColor(status as Session["status"]),
                    )}
                  >
                    {count} {status}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        {sortedDates.length > 3 && (
          <div className="text-xs text-gray-500">
            +{sortedDates.length - 3} more dates
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group flex flex-row items-center py-1",
        props.todo.data.completed === true && "opacity-60",
      )}
    >
      <div className="flex grow items-center gap-3">
        <Checkbox
          checked={!!props.todo.data.completed}
          onCheckedChange={handleToggleComplete}
          disabled={updateTodo.isPending}
        />
        <div className="flex-1">
          <button
            onClick={() => router.push(`/task/${props.todo.id}`)}
            className={cn(
              "cursor-pointer text-left text-base font-medium hover:text-blue-600 hover:underline",
              props.todo.data.completed === true && "line-through",
            )}
          >
            {typeof props.todo.data.title === "string"
              ? props.todo.data.title
              : "Untitled"}
          </button>
          {props.showSessions &&
            formatSessionSummary(props.todo.data.sessions ?? [])}
        </div>
      </div>
      <div className="ml-4 flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="cursor-pointer text-xs underline"
          onClick={() => setIsEditing(true)}
        >
          Edit
        </button>
        <button
          className="cursor-pointer text-xs text-red-600 underline disabled:cursor-not-allowed"
          onClick={() => deleteTodo.mutate(props.todo.id)}
          disabled={deleteTodo.isPending}
        >
          Delete
        </button>
      </div>
      <BaseModal
        open={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <TodoForm
          initial={{
            title:
              typeof props.todo.data.title === "string"
                ? props.todo.data.title
                : "",
            description:
              typeof props.todo.data.description === "string"
                ? props.todo.data.description
                : "",
            sessions: props.todo.data.sessions ?? [],
          }}
          submitLabel="Update"
          pending={updateTodo.isPending}
          initialFocusRef={initialFocusRef}
          onSubmit={(values) =>
            updateTodo.mutate(
              { id: props.todo.id, ...values },
              { onSuccess: () => setIsEditing(false) },
            )
          }
        />
      </BaseModal>
    </div>
  );
}

export function TodoCardSkeleton(props: { pulse?: boolean }) {
  const { pulse = true } = props;
  return (
    <div className="flex flex-row items-center py-3">
      <div className="flex grow items-center gap-3">
        <div
          className={cn(
            "h-4 w-4 rounded border-2 bg-gray-300",
            pulse && "animate-pulse",
          )}
        />
        <div className="flex-1">
          <h2
            className={cn(
              "w-1/4 rounded-sm bg-black/70 text-base",
              pulse && "animate-pulse",
            )}
          >
            &nbsp;
          </h2>
          <div
            className={cn(
              "mt-0.5 w-1/6 rounded-sm bg-black/30 text-xs",
              pulse && "animate-pulse",
            )}
          >
            &nbsp;
          </div>
        </div>
      </div>
    </div>
  );
}
