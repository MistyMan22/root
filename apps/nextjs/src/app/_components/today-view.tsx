"use client";

import { useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";

import { useTRPC } from "~/trpc/react";
import { TodoCard } from "./todos";

export function TodayView() {
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const listId = searchParams.get("list") ?? undefined;
  const { data: todos } = useSuspenseQuery(
    trpc.todo.all.queryOptions(listId ? { listId } : undefined),
  );
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

  // Sort todos: incomplete first, then completed
  const sortedTodayTodos = [...todayTodos].sort((a, b) => {
    const aCompleted = a.data.completed === true;
    const bCompleted = b.data.completed === true;

    // If both have same completion status, maintain original order
    if (aCompleted === bCompleted) return 0;

    // Incomplete tasks come first
    return aCompleted ? 1 : -1;
  });

  if (sortedTodayTodos.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-500">No tasks for today</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTodayTodos.map((todo) => (
        <TodoCard key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
