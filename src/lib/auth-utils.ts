import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export const requireAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return session;
};

export const getSessionFromRequest = async (request: Request) => {
  return auth.api.getSession({
    headers: request.headers,
  });
};

export const requireApiAuth = async (request: Request) => {
  const session = await getSessionFromRequest(request);

  if (!session) {
    return { error: "Unauthorized", session: null } as const;
  }

  return { error: null, session } as const;
};

export const requireUnAuth = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/");
  }
};
