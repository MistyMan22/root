"use client";

import type { RouterOutputs } from "@acme/api";

import { TodoCard } from "./todos";

type Todo = RouterOutputs["todo"]["all"][number];

interface AllTasksViewProps {
  todos: Todo[];
}

export function AllTasksView({ todos }: AllTasksViewProps) {
  if (todos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No tasks yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} showSessions={true} />
      ))}
    </div>
  );
}
