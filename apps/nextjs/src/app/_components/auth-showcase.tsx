import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";

export async function AuthShowcase() {
  const user = await currentUser();
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <SignedOut>
        <div className="text-center text-2xl">Not signed in</div>
      </SignedOut>
      <SignedIn>
        <p className="text-center text-2xl">
          <span>
            Logged in as {user?.firstName ?? user?.username ?? user?.id}
          </span>
        </p>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
