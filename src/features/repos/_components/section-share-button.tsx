"use client";

import { Check, LinkIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type SectionShareButtonProps = {
  sectionId: string;
  title: string;
};

export const SectionShareButton = ({
  sectionId,
  title,
}: SectionShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const url = new URL(window.location.href);
    url.hash = sectionId;

    await navigator.clipboard.writeText(url.toString());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <Button
      aria-label={`Copy link to ${title}`}
      className="size-8"
      onClick={copyLink}
      size="icon"
      type="button"
      variant="ghost"
    >
      {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
    </Button>
  );
};
