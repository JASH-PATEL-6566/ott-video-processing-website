"use client";

import {
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ProcessingStep = "uploaded" | "processing" | "completed" | null;
export type ProcessingStatus = {
  originalUploaded: ProcessingStep;
  videoProcessed: ProcessingStep;
  processedUploaded: ProcessingStep;
  originalVideoUrl?: string;
  processedVideoUrl?: string;
};

interface VideoProcessingStepsProps {
  status: ProcessingStatus;
}

export function VideoProcessingSteps({ status }: VideoProcessingStepsProps) {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedProcessed, setCopiedProcessed] = useState(false);

  const copyToClipboard = async (text: string, isOriginal: boolean) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isOriginal) {
        setCopiedOriginal(true);
        setTimeout(() => setCopiedOriginal(false), 2000);
      } else {
        setCopiedProcessed(true);
        setTimeout(() => setCopiedProcessed(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center gap-2">
        <StepIndicator status={status.originalUploaded} />
        <span className="text-sm">Original Video Uploaded to Wasabi</span>
        {(status.originalUploaded === "completed" ||
          status.originalUploaded === "uploaded") &&
          status.originalVideoUrl && (
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                <a
                  href={status.originalVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">View</span>
                </a>
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(status.originalVideoUrl!, true)
                      }
                    >
                      {copiedOriginal ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only">Copy URL</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedOriginal ? "Copied!" : "Copy URL"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
      </div>
      <div className="flex items-center gap-2">
        <StepIndicator status={status.videoProcessed} />
        <span className="text-sm">Original Video Processed</span>
      </div>
      <div className="flex items-center gap-2">
        <StepIndicator status={status.processedUploaded} />
        <span className="text-sm">Processed Video Uploaded to Wasabi</span>
        {status.processedUploaded === "completed" &&
          status.processedVideoUrl && (
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 px-2" asChild>
                <a
                  href={status.processedVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">View</span>
                </a>
              </Button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() =>
                        copyToClipboard(status.processedVideoUrl!, false)
                      }
                    >
                      {copiedProcessed ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span className="sr-only">Copy URL</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{copiedProcessed ? "Copied!" : "Copy URL"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
      </div>
    </div>
  );
}

function StepIndicator({ status }: { status: ProcessingStep }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  } else if (status === "processing") {
    return (
      <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
    );
  } else if (status === "uploaded") {
    return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />;
  } else {
    return <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
  }
}
