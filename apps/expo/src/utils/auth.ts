import * as SecureStore from "expo-secure-store";

export async function getToken() {
  try {
    const token = await SecureStore.getItemAsync("CLERK_TOKEN");
    return token ?? null;
  } catch {
    return null;
  }
}
