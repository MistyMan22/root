"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "@radix-ui/react-icons";
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

const TodoForm = (props: {
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
}) => {
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
  const queryClient = useQueryClient();
  const { data: taskLists = [] } = useSuspenseQuery(
    trpc.taskList.all.queryOptions(),
  ) as { data: TaskList[] };

  // Convert task lists to options format
  const listOptions: CreatableSelectOption[] = taskLists.map(
    (list: TaskList) => ({
      value: list.id,
      label: list.data.name || "Unnamed List",
    }),
  );
  const [stagedOptions, setStagedOptions] = useState<CreatableSelectOption[]>([
    { value: "__none__", label: "No list" },
  ]);
  const [pendingListCreatesById, setPendingListCreatesById] = useState<
    Record<string, string>
  >({});
  const [isPersistingTempList, setIsPersistingTempList] = useState(false);
  // eslint-disable-next-line no-console
  console.log("🔥 [TodoForm] RENDER START", {
    listId,
    stagedCount: stagedOptions.length,
    optionsCount: listOptions.length,
    stagedOptions,
    listOptions: listOptions.map((o) => ({ value: o.value, label: o.label })),
    pendingListCreatesById,
    isPersistingTempList,
  });

  // Staged mode: we do NOT create on server here. We collect staged option and let parent save later
  const handleStagedCreate = (temp: { id: string; label: string }) => {
    // eslint-disable-next-line no-console
    console.log("🔥 [TodoForm] handleStagedCreate START", {
      temp,
      currentStagedCount: stagedOptions.length,
      currentStagedOptions: stagedOptions,
    });
    setStagedOptions((prev) => {
      const alreadyExists = prev.some((o) => o.value === temp.id);
      // eslint-disable-next-line no-console
      console.log("🔥 [TodoForm] handleStagedCreate setStagedOptions", {
        prev,
        temp,
        alreadyExists,
        willAdd: !alreadyExists,
      });
      if (alreadyExists) {
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] handleStagedCreate ALREADY EXISTS", {
          temp,
        });
        return prev;
      }
      const newState = [...prev, { value: temp.id, label: temp.label }];
      // eslint-disable-next-line no-console
      console.log("🔥 [TodoForm] handleStagedCreate ADDING", { newState });
      return newState;
    });
    setPendingListCreatesById((prev) => {
      const updated = { ...prev, [temp.id]: temp.label };
      // eslint-disable-next-line no-console
      console.log("🔥 [TodoForm] handleStagedCreate pending map", {
        prev,
        updated,
      });
      return updated;
    });
    // eslint-disable-next-line no-console
    console.log("🔥 [TodoForm] handleStagedCreate END", { temp });
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

  useEffect(() => {
    setStagedOptions((prev) => {
      const filtered = prev.filter((option) => {
        if (option.value === "__none__") {
          return true;
        }
        if (option.value.startsWith("temp:")) {
          return true;
        }
        const stillMissing = !listOptions.some(
          (base) => base.value === option.value,
        );
        return stillMissing;
      });

      const hasChanges =
        filtered.length !== prev.length ||
        filtered.some((option, index) => option.value !== prev[index]?.value);

      if (!hasChanges) {
        return prev;
      }

      // eslint-disable-next-line no-console
      console.log("🔥 [TodoForm] stagedOptions cleanup", {
        before: prev,
        after: filtered,
        listOptions,
      });

      return filtered;
    });
  }, [listOptions]);

  // Mutation hook for creating task lists (used when persisting staged lists)
  const createTaskListMutation = useMutation(
    trpc.taskList.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.taskList.pathFilter());
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] createTaskListMutation ERROR", { err });
        toast.error(
          err.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to create lists"
            : "Failed to create list",
        );
      },
    }),
  );

  const handleAddSession = (session: Session) => {
    setSessions((prev) => [...prev, session]);
  };

  const handleUpdateSession = (index: number, session: Session) => {
    setSessions((prev) => prev.map((s, i) => (i === index ? session : s)));
  };

  const handleDeleteSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // eslint-disable-next-line no-console
    console.log("🔥 [TodoForm] handleFormSubmit START", {
      title,
      hasDescription: description.trim().length > 0,
      sessionCount: sessions.length,
      listId,
      pendingListCreatesById,
    });

    let resolvedListId: string | undefined = listId || undefined;

    if (listId?.startsWith("temp:")) {
      const stagedLabel = pendingListCreatesById[listId];
      // eslint-disable-next-line no-console
      console.log("🔥 [TodoForm] handleFormSubmit TEMP LIST", {
        listId,
        stagedLabel,
      });

      if (!stagedLabel) {
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] handleFormSubmit TEMP LIST MISSING LABEL", {
          listId,
          pendingListCreatesById,
        });
        toast.error("Could not resolve the staged list name. Please try again.");
        return;
      }

      try {
        setIsPersistingTempList(true);
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] handleFormSubmit PERSIST STAGED START", {
          listId,
          stagedLabel,
        });
        const newList = (await createTaskListMutation.mutateAsync({
          name: stagedLabel.trim(),
          description: "",
        })) as TaskList;
        resolvedListId = newList.id;

        setListId(newList.id);
        setStagedOptions((prev) => {
          const updated = prev.map((option) =>
            option.value === listId
              ? {
                  value: newList.id,
                  label: newList.data.name || stagedLabel,
                }
              : option,
          );
          // eslint-disable-next-line no-console
          console.log("🔥 [TodoForm] handleFormSubmit PERSIST STAGED UPDATED", {
            listId,
            newList,
            updated,
          });
          return updated;
        });
        setPendingListCreatesById((prev) => {
          const { [listId]: _removed, ...rest } = prev;
          // eslint-disable-next-line no-console
          console.log("🔥 [TodoForm] handleFormSubmit PERSIST pending cleanup", {
            listId,
            rest,
          });
          return rest;
        });

        // Query invalidation is handled by createTaskListMutation.onSuccess
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] handleFormSubmit PERSIST STAGED SUCCESS", {
          resolvedListId,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.log("🔥 [TodoForm] handleFormSubmit PERSIST STAGED ERROR", {
          error,
        });
        toast.error("Failed to save the new list. Please try again.");
        return;
      } finally {
        setIsPersistingTempList(false);
      }
    }

    const payload = {
      title,
      description,
      sessions,
      listId: resolvedListId === "" ? undefined : resolvedListId,
    };

    // eslint-disable-next-line no-console
    console.log("🔥 [TodoForm] handleFormSubmit CALLING onSubmit", {
      payload,
    });
    onSubmit(payload);
    // eslint-disable-next-line no-console
    console.log("🔥 [TodoForm] handleFormSubmit END", {
      resolvedListId,
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
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
            onChange={(value) => {
              // eslint-disable-next-line no-console
              console.log("🔥 [TodoForm] CreatableSelect onChange START", {
                value,
                currentListId: listId,
                stagedOptions,
                listOptions: listOptions.map((o) => ({
                  value: o.value,
                  label: o.label,
                })),
              });
              setListId((prev) => {
                const next = value === "__none__" ? "" : (value ?? "");
                // eslint-disable-next-line no-console
                console.log(
                  "🔥 [TodoForm] CreatableSelect onChange setListId",
                  {
                    prev,
                    next,
                    value,
                    isNone: value === "__none__",
                    isUndefined: value === undefined,
                    isNull: value === null,
                  },
                );
                return next;
              });
              // eslint-disable-next-line no-console
              console.log("🔥 [TodoForm] CreatableSelect onChange END", {
                value,
              });
            }}
            options={listOptions}
            extraOptions={stagedOptions}
            mode="staged"
            onStagedCreate={handleStagedCreate}
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
          disabled={pending || isPersistingTempList || createTaskListMutation.isPending}
          className="w-full py-3 text-base"
        >
          {pending || isPersistingTempList || createTaskListMutation.isPending
            ? "Saving..."
            : submitLabel}
        </Button>
      </div>
    </form>
  );
};

// AGENT NOTES: TodoForm
// - Unified create/edit task form with staged list creation support; now resolves temp list IDs via TRPC before invoking parent submit.
// - Maintains pending temp list labels and prunes staged options once canonical data loads to prevent duplicates.
// - Updated 2025-10-31: converted to arrow style, added persistence workflow, submit guarding, and expanded telemetry for debugging add-to-list issues.

export const CreateTodoForm = ({ onSuccess }: { onSuccess?: () => void }) => {
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
};

// AGENT NOTES: CreateTodoForm
// - Wraps TodoForm for the create flow, wires TRPC mutation invalidation, and now leverages TodoForm’s staged list persistence.
// - Updated 2025-10-31: converted to arrow function and aligned notes/logging expectations for debugging add-to-list saves.

export const AddTodoButton = () => {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white font-bold text-lg px-8 py-4 border-0 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 hover:from-purple-700 hover:via-pink-600 hover:to-purple-700 bg-[length:200%_100%] hover:bg-[position:100%_0]"
        onClick={() => setOpen(true)}
      >
        <span className="relative z-10 flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Add Task
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
      </Button>
      <BaseModal
        open={open}
        onClose={() => setOpen(false)}
        title="Add Task"
        initialFocusRef={initialFocusRef as React.RefObject<HTMLElement>}
      >
        <CreateTodoForm onSuccess={() => setOpen(false)} />
      </BaseModal>
    </>
  );
};

// AGENT NOTES: AddTodoButton
// - Controls modal toggling around CreateTodoForm; maintains focus target for accessibility.
// - Premium styling: gradient background (black to gray), shimmer effect on hover, scale animation, shadow elevation, plus icon.
// - Updated 2025-10-31: converted to arrow function, redesigned with gradient, animations, and enhanced visual appeal for prominent header placement.

type Todo = RouterOutputs["todo"]["all"][number];

export const TodoCard = (props: { todo: Todo; showSessions?: boolean }) => {
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
};

// AGENT NOTES: TodoCard
// - Renders individual task rows with completion toggles, editing modal, and delete support; relies on TodoForm for editing.
// - Updated 2025-10-31: converted to arrow function to comply with style guide while retaining existing logging.

export const TodoCardSkeleton = (props: { pulse?: boolean }) => {
  const { pulse = true } = props;
  return (
    <div className="flex flex-row items-center py-4 border-b border-gray-100 last:border-b-0">
      <div className="flex grow items-center gap-3">
        <div
          className={cn(
            "h-5 w-5 rounded border-2 border-gray-200 bg-gray-100 flex-shrink-0",
            pulse && "animate-pulse",
          )}
        />
        <div
          className={cn(
            "h-5 w-3/5 rounded-md",
            pulse
              ? "bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-[shimmer_2s_infinite] bg-[length:200%_100%]"
              : "bg-gray-200",
          )}
        />
      </div>
    </div>
  );
};

// AGENT NOTES: TodoCardSkeleton
// - Lightweight shimmer placeholder for TodoCard rows; exposes pulse toggle for testing/consistent layout.
// - Updated 2025-10-31: converted to arrow function and documented usage per workspace guidelines.

// AGENT NOTES: File - todos.tsx
// - Aggregates todo CRUD UI, now includes staged list persistence to unblock “add to list” flow and pervasive logging for diagnostics.
// - Updated 2025-10-31: standardized arrow components, added agent notes, and instrumented staged list resolution path.
