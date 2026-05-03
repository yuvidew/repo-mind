import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DemoRepo } from "./repo-demo-data";

type RepoChatPanelProps = {
  repo: DemoRepo;
};

export const RepoChatPanel = ({ repo }: RepoChatPanelProps) => {
  return (
    <aside className="lg:sticky lg:top-6">
      <Card className="min-h-[520px] p-0">
        <div className="flex min-h-[520px] flex-col p-4">
          <div className="border-b pb-3">
            <h2 className="font-semibold">Repo chat</h2>
            <p className="text-muted-foreground text-sm">
              Ask about {repo.owner}/{repo.name}
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="size-6" />
            </div>
            <p className="font-medium">Ask about this repository</p>
            <p className="mt-2 max-w-56 text-muted-foreground text-sm leading-6">
              Chat will unlock after repo chunks and citations are persisted.
            </p>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex gap-2">
              <Input disabled placeholder="Ask about this repository" />
              <Button disabled size="icon">
                <Send />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            <p className="text-center text-muted-foreground text-xs">
              Answers will include file citations when chat is connected.
            </p>
          </div>
        </div>
      </Card>
    </aside>
  );
};
