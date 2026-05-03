"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GalleryVerticalEnd } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const forgotPasswordSchema = z.object({
  email: z.email("Enter a valid email address."),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const successMessage =
  "If an account exists, check your email for a reset link.";

export const ForgotPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    let handledError = false;

    try {
      await authClient.requestPasswordReset(
        {
          email: values.email,
          redirectTo: "/reset-password",
        },
        {
          onSuccess: () => {
            toast.success(successMessage);
            form.reset();
          },
          onError: () => {
            handledError = true;
            toast.success(successMessage);
          },
        },
      );
    } catch {
      if (!handledError) {
        toast.success(successMessage);
      }
    }
  };

  const isPending = form.formState.isSubmitting;

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="flex flex-col items-center gap-2 text-center">
              <a
                href="/"
                className="flex flex-col items-center gap-2 font-medium"
              >
                <div className="flex size-8 items-center justify-center rounded-md">
                  <GalleryVerticalEnd className="size-6" />
                </div>
                <span className="sr-only">RepoMind</span>
              </a>
              <h1 className="text-xl font-bold">Reset your password</h1>
              <FieldDescription>
                Enter your email and we&apos;ll send you a reset link.
              </FieldDescription>
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="m@example.com"
                      autoComplete="email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Field>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? <Spinner /> : "Send reset link"}
              </Button>
            </Field>
            <FieldDescription className="text-center">
              Remember your password? <a href="/sign-in">Sign in</a>
            </FieldDescription>
          </FieldGroup>
        </form>
      </Form>
    </div>
  );
};
