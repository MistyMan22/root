import { SafeAreaView, Text, View } from "react-native";
import { Stack, useGlobalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/utils/api";

export default function Todo() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { data } = useQuery(trpc.todo.byId.queryOptions({ id }));

  if (!data) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: data.title }} />
      <View className="h-full w-full p-4">
        <Text className="text-primary py-2 text-3xl font-bold">
          {data.title}
        </Text>
        <View className="py-4">
          <Text
            className={`text-sm font-medium uppercase tracking-wide ${getPriorityColor(data.priority)}`}
          >
            Priority: {data.priority}
          </Text>
          <Text className="text-foreground py-2">
            Status: {data.completed ? "Completed" : "Pending"}
          </Text>
          <Text className="text-foreground py-2">
            Created: {new Date(data.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
