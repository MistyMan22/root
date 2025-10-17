import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { SignIn, useAuth, useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";

function TodoCard(props: {
  todo: RouterOutputs["todo"]["all"][number];
  onDelete: () => void;
  onToggle: () => void;
}) {
  return (
    <View className="bg-muted flex flex-row items-center rounded-lg p-4">
      <View className="flex grow items-center space-x-3">
        <Pressable
          onPress={props.onToggle}
          className="border-primary h-6 w-6 items-center justify-center rounded border-2"
        >
          {props.todo.completed && (
            <Text className="text-primary text-lg">✓</Text>
          )}
        </Pressable>
        <View className="flex-1">
          <Text
            className={`text-primary text-xl font-semibold ${props.todo.completed ? "line-through opacity-60" : ""}`}
          >
            {props.todo.title}
          </Text>
          <View className="mt-1 flex flex-row items-center gap-2">
            <Text
              className={`text-xs font-medium tracking-wide uppercase ${
                props.todo.priority === "high"
                  ? "text-red-500"
                  : props.todo.priority === "medium"
                    ? "text-yellow-500"
                    : "text-green-500"
              }`}
            >
              {props.todo.priority}
            </Text>
            <Text className="text-xs text-gray-500">
              {new Date(props.todo.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
      <Pressable onPress={props.onDelete}>
        <Text className="text-primary font-bold uppercase">Delete</Text>
      </Pressable>
    </View>
  );
}

function CreateTodo() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const { mutate, error } = useMutation(
    trpc.todo.create.mutationOptions({
      async onSuccess() {
        setTitle("");
        setPriority("medium");
        await queryClient.invalidateQueries(trpc.todo.all.queryFilter());
      },
    }),
  );

  return (
    <View className="mt-4 flex gap-2">
      <TextInput
        className="border-input bg-background text-foreground items-center rounded-md border px-3 text-lg leading-tight"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
      />
      {error?.data?.zodError?.fieldErrors?.title && (
        <Text className="text-destructive mb-2">
          {error.data.zodError.fieldErrors.title}
        </Text>
      )}
      <View className="flex flex-row gap-2">
        <Pressable
          className={`flex-1 items-center rounded-sm p-2 ${
            priority === "low" ? "bg-green-500" : "bg-gray-500"
          }`}
          onPress={() => setPriority("low")}
        >
          <Text className="text-white">Low</Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-sm p-2 ${
            priority === "medium" ? "bg-yellow-500" : "bg-gray-500"
          }`}
          onPress={() => setPriority("medium")}
        >
          <Text className="text-white">Medium</Text>
        </Pressable>
        <Pressable
          className={`flex-1 items-center rounded-sm p-2 ${
            priority === "high" ? "bg-red-500" : "bg-gray-500"
          }`}
          onPress={() => setPriority("high")}
        >
          <Text className="text-white">High</Text>
        </Pressable>
      </View>
      <Pressable
        className="bg-primary flex items-center rounded-sm p-2"
        onPress={() => {
          mutate({
            title,
            priority,
          });
        }}
      >
        <Text className="text-foreground">Add Todo</Text>
      </Pressable>
      {error?.data?.code === "UNAUTHORIZED" && (
        <Text className="text-destructive mt-2">
          You need to be logged in to create a todo
        </Text>
      )}
    </View>
  );
}

function MobileAuth() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();

  if (!isSignedIn) {
    return (
      <View className="flex-1">
        <SignIn />
      </View>
    );
  }

  return (
    <>
      <Text className="text-foreground pb-2 text-center text-xl font-semibold">
        Hello, {user?.username || user?.emailAddresses[0]?.emailAddress}
      </Text>
      <Pressable
        onPress={() => signOut()}
        className="bg-primary flex items-center rounded-sm p-2"
      >
        <Text>Sign Out</Text>
      </Pressable>
    </>
  );
}

export default function Index() {
  const queryClient = useQueryClient();

  const todoQuery = useQuery(trpc.todo.all.queryOptions());

  const deleteTodoMutation = useMutation(
    trpc.todo.delete.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.todo.all.queryFilter()),
    }),
  );

  const updateTodoMutation = useMutation(
    trpc.todo.update.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.todo.all.queryFilter()),
    }),
  );

  return (
    <SafeAreaView className="bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Todo List" }} />
      <View className="bg-background h-full w-full p-4">
        <Text className="text-foreground pb-2 text-center text-5xl font-bold">
          Todo <Text className="text-primary">List</Text>
        </Text>

        <MobileAuth />

        <View className="py-2">
          <Text className="text-primary font-semibold italic">
            Tap to toggle, swipe to delete
          </Text>
        </View>

        <LegendList
          data={todoQuery.data ?? []}
          estimatedItemSize={20}
          keyExtractor={(item: RouterOutputs["todo"]["all"][number]) => item.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={(p: { item: RouterOutputs["todo"]["all"][number] }) => (
            <TodoCard
              todo={p.item}
              onDelete={() => deleteTodoMutation.mutate(p.item.id)}
              onToggle={() =>
                updateTodoMutation.mutate({
                  id: p.item.id,
                  completed: !p.item.completed,
                })
              }
            />
          )}
        />

        <CreateTodo />
      </View>
    </SafeAreaView>
  );
}
