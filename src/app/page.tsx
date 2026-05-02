import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ClientGreeting } from "@/components/client-greeting";
import { getQueryClient, trpc } from "../trpc/server";

export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.hello.queryOptions({ text: "from the server" }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div>...</div>
      {/** ... */}
      <ClientGreeting />
    </HydrationBoundary>
  );
}
