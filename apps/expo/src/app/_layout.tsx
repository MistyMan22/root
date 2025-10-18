import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

import { queryClient } from "~/utils/api";

import "../styles.css";

import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { ClerkProvider } from "@clerk/clerk-expo";
import { QueryClientProvider } from "@tanstack/react-query";

WebBrowser.maybeCompleteAuthSession();

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
      await SecureStore.setItemAsync("CLERK_TOKEN", value);
    } catch {}
  },
};

// This is the main layout of the app
// It wraps your pages with the providers they need
export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  return (
    <ClerkProvider
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <QueryClientProvider client={queryClient}>
        {/*
            The Stack component displays the current page.
            It also allows you to configure your screens 
          */}
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: "#f472b6",
            },
            contentStyle: {
              backgroundColor: colorScheme == "dark" ? "#09090B" : "#FFFFFF",
            },
          }}
        />
        <StatusBar />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
