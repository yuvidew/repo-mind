import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { GITHUB_REPO_ACCESS_SCOPES } from "@/lib/github-auth";
import { serverConfig } from "@/lib/server-config";
import prisma from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        url,
      });
    },
  },
  account: {
    encryptOAuthTokens: true,
  },
  socialProviders: {
    github: {
      clientId: serverConfig.auth.githubClientId as string,
      clientSecret: serverConfig.auth.githubClientSecret as string,
      scope: [...GITHUB_REPO_ACCESS_SCOPES],
    },
  },
});
