import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Header } from "./header";
import { Hero } from "./hero";

export const HomeView = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <main className="flex-1 bg-background text-foreground">
      <Header
        isSignedIn={Boolean(session)}
        userEmail={session?.user.email ?? null}
        userImage={session?.user.image ?? null}
        userName={session?.user.name ?? null}
      />
      <Hero />
    </main>
  );
};
