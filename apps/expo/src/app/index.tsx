import React, { useState } from "react";
import { Button, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Stack } from "expo-router";
import { useAuth, useOAuth, useUser } from "@clerk/clerk-expo";
import { LegendList } from "@legendapp/list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { RouterOutputs } from "~/utils/api";
import { trpc } from "~/utils/api";

function PostCard(props: {
  post: RouterOutputs["post"]["all"][number];
  onDelete: () => void;
}) {
  return (
    <View className="flex flex-row rounded-lg bg-muted p-4">
      <View className="flex-grow">
        <Link
          asChild
          href={{
            pathname: "/post/[id]",
            params: { id: props.post.id },
          }}
        >
          <Pressable className="">
            <Text className="text-xl font-semibold text-primary">
              {props.post.title}
            </Text>
            <Text className="mt-2 text-foreground">{props.post.content}</Text>
          </Pressable>
        </Link>
      </View>
      <Pressable onPress={props.onDelete}>
        <Text className="font-bold uppercase text-primary">Delete</Text>
      </Pressable>
    </View>
  );
}

function CreatePost() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { mutate, error } = useMutation(
    trpc.post.create.mutationOptions({
      async onSuccess() {
        setTitle("");
        setContent("");
        await queryClient.invalidateQueries(trpc.post.all.queryFilter());
      },
    }),
  );

  return (
    <View className="mt-4 flex gap-2">
      <TextInput
        className="items-center rounded-md border border-input bg-background px-3 text-lg leading-[1.25] text-foreground"
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
      />
      {error?.data?.zodError?.fieldErrors.title && (
        <Text className="mb-2 text-destructive">
          {error.data.zodError.fieldErrors.title}
        </Text>
      )}
      <TextInput
        className="items-center rounded-md border border-input bg-background px-3 text-lg leading-[1.25] text-foreground"
        value={content}
        onChangeText={setContent}
        placeholder="Content"
      />
      {error?.data?.zodError?.fieldErrors.content && (
        <Text className="mb-2 text-destructive">
          {error.data.zodError.fieldErrors.content}
        </Text>
      )}
      <Pressable
        className="flex items-center rounded bg-primary p-2"
        onPress={() => {
          mutate({
            title,
            content,
          });
        }}
      >
        <Text className="text-foreground">Create</Text>
      </Pressable>
      {error?.data?.code === "UNAUTHORIZED" && (
        <Text className="mt-2 text-destructive">
          You need to be logged in to create a post
        </Text>
      )}
    </View>
  );
}

function MobileAuth() {
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  return (
    <>
      <Text className="pb-2 text-center text-xl font-semibold text-zinc-900">
        {isSignedIn
          ? `Hello, ${user?.firstName ?? user?.username ?? user?.id}`
          : "Not logged in"}
      </Text>
      <Button
        onPress={async () => {
          if (isSignedIn) await signOut();
          // Implement native sign-in screen or OAuth here using Clerk hooks
        }}
        title={isSignedIn ? "Sign Out" : "Sign In"}
        color={"#5B65E9"}
      />
    </>
  );
}

export default function Index() {
  const queryClient = useQueryClient();

  const postQuery = useQuery(trpc.post.all.queryOptions());

  const deletePostMutation = useMutation(
    trpc.post.delete.mutationOptions({
      onSettled: () =>
        queryClient.invalidateQueries(trpc.post.all.queryFilter()),
    }),
  );

  return (
    <SafeAreaView className="bg-background">
      {/* Changes page title visible on the header */}
      <Stack.Screen options={{ title: "Home Page" }} />
      <View className="h-full w-full bg-background p-4">
        <Text className="pb-2 text-center text-5xl font-bold text-foreground">
          Create <Text className="text-primary">T3</Text> Turbo
        </Text>

        <MobileAuth />
        <OAuthButtons />

        <View className="py-2">
          <Text className="font-semibold italic text-primary">
            Press on a post
          </Text>
        </View>

        <LegendList
          data={postQuery.data ?? []}
          estimatedItemSize={20}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={(p) => (
            <PostCard
              post={p.item}
              onDelete={() => deletePostMutation.mutate(p.item.id)}
            />
          )}
        />

        <CreatePost />
      </View>
    </SafeAreaView>
  );
}

function OAuthButtons() {
  const { isSignedIn, setActive } = useAuth();
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_discord" });
  if (isSignedIn) return null;
  return (
    <View className="mt-2">
      <Button
        title="Sign in with Discord"
        color={"#5B65E9"}
        onPress={async () => {
          try {
            const { createdSessionId, setActive: setActiveFromOAuth } =
              await startOAuthFlow();
            const setActiveFn = setActiveFromOAuth ?? setActive;
            if (createdSessionId && setActiveFn) {
              await setActiveFn({ session: createdSessionId });
            }
          } catch (e) {
            console.error(e);
          }
        }}
      />
    </View>
  );
}
