"use client";

import type { RouterOutputs } from "@acme/api";

import { TodoCard } from "./todos";

type Todo = RouterOutputs["todo"]["all"][number];

interface TodayViewProps {
  todos: Todo[];
}

export function TodayView({ todos }: TodayViewProps) {
  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Filter tasks that have sessions today ONLY
  const todayTodos = todos.filter((todo) => {
    const sessions = todo.data.sessions || [];

    // Only include tasks that have sessions scheduled for today
    return sessions.some((session) => {
      if (!session.startTimeDate) return false;
      return session.startTimeDate === todayString;
    });
  });

  if (todayTodos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No tasks for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todayTodos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
