"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { useRef } from "react";

import { Button } from "@acme/ui/button";
import { useTRPC } from "~/trpc/react";
import { TodoCard } from "./todos";

const formatDateString = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const TodayView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const dateInputRef = useRef<HTMLInputElement>(null);

  const listId = searchParams.get("list") ?? undefined;
  const dateParam = searchParams.get("date");

  // Get current date from URL or default to today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentDate = dateParam ? parseDateString(dateParam) : today;
  const currentDateString = formatDateString(currentDate);
  const todayString = formatDateString(today);

  const { data: todos } = useSuspenseQuery(
    trpc.todo.all.queryOptions(listId ? { listId } : undefined),
  );

  // Filter tasks that have sessions on the selected date
  const dateTodos = todos.filter((todo) => {
    const sessions = todo.data.sessions || [];
    return sessions.some((session) => {
      if (!session.startTimeDate) return false;
      return session.startTimeDate === currentDateString;
    });
  });

  // Sort todos: incomplete first, then completed
  const sortedDateTodos = [...dateTodos].sort((a, b) => {
    const aCompleted = a.data.completed === true;
    const bCompleted = b.data.completed === true;
    if (aCompleted === bCompleted) return 0;
    return aCompleted ? 1 : -1;
  });

  const updateDate = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    const newDateString = formatDateString(newDate);
    
    if (newDateString === todayString) {
      params.delete("date");
    } else {
      params.set("date", newDateString);
    }

    router.push(`?${params.toString()}`, { scroll: false });
  };

  const goToPreviousDay = () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    updateDate(prevDate);
  };

  const goToNextDay = () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    updateDate(nextDate);
  };

  const goToToday = () => {
    updateDate(today);
  };

  const handleDateChange = (dateString: string) => {
    if (dateString) {
      updateDate(parseDateString(dateString));
    }
  };

  const formatDisplayDate = (date: Date): string => {
    const isToday = formatDateString(date) === todayString;
    if (isToday) return "Today";
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (formatDateString(date) === formatDateString(yesterday)) return "Yesterday";
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (formatDateString(date) === formatDateString(tomorrow)) return "Tomorrow";
    
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Navigation Controls */}
      <div className="relative flex items-center justify-center py-2">
        {/* Previous Day Button - Upper Left */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousDay}
          className="absolute left-0 h-9 w-9 p-0 rounded-md border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="h-5 w-5 text-gray-700" />
        </Button>

        {/* Date Picker Button and Home Button - Center */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              ref={dateInputRef}
              type="date"
              value={currentDateString}
              onChange={(e) => handleDateChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => dateInputRef.current?.showPicker()}
              className="h-9 px-4 rounded-md border-gray-300 bg-white hover:bg-gray-50 transition-colors font-medium text-gray-900 min-w-[180px]"
            >
              {formatDisplayDate(currentDate)}
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="h-9 w-9 p-0 rounded-md border-gray-300 hover:bg-gray-50 transition-colors"
            title="Go to today"
            aria-label="Go to today"
          >
            <svg
              className="h-4 w-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Button>
        </div>

        {/* Next Day Button - Upper Right */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextDay}
          className="absolute right-0 h-9 w-9 p-0 rounded-md border-gray-300 hover:bg-gray-50 transition-colors"
          aria-label="Next day"
        >
          <ChevronRightIcon className="h-5 w-5 text-gray-700" />
        </Button>
      </div>

      {/* Tasks List */}
      {sortedDateTodos.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-gray-500">No tasks for this day</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDateTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </div>
      )}
    </div>
  );
};

// AGENT NOTES: TodayView
// - Day view with date navigation: custom date button showing formatted date, prev/next buttons, home button to jump to today.
// - Filters tasks by selected date (defaults to today), maintains URL state for date selection.
// - Updated 2025-10-31: removed date header, added date text to button, enhanced button styling with borders, reduced vertical padding.
