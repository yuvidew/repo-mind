import { GalleryVerticalEnd } from "lucide-react";

import { FieldDescription } from "@/components/ui/field";
import { ResetPasswordForm } from "@/features/auth/_components/reset-password-form";
import { requireUnAuth } from "@/lib/auth-utils";

type ResetPasswordPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const ResetPasswordPage = async ({ searchParams }: ResetPasswordPageProps) => {
  await requireUnAuth();

  const tokenParam = (await searchParams).token;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

  if (!token) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center gap-2">
          <a href="/" className="flex flex-col items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md">
              <GalleryVerticalEnd className="size-6" />
            </div>
            <span className="sr-only">RepoMind</span>
          </a>
          <h1 className="text-xl font-bold">Reset link is invalid</h1>
          <FieldDescription>
            Request a new password reset link to continue.
          </FieldDescription>
        </div>
        <FieldDescription>
          <a href="/forgot-password">Request a new link</a>
        </FieldDescription>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
};

export default ResetPasswordPage;
