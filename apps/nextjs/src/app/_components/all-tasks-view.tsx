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

  // Sort todos: incomplete first, then completed
  const sortedTodos = [...todos].sort((a, b) => {
    const aCompleted = a.data.completed === true;
    const bCompleted = b.data.completed === true;

    // If both have same completion status, maintain original order
    if (aCompleted === bCompleted) return 0;

    // Incomplete tasks come first
    return aCompleted ? 1 : -1;
  });

  return (
    <div className="space-y-2">
      {sortedTodos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} showSessions={true} />
      ))}
    </div>
  );
}
