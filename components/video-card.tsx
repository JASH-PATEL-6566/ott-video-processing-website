"use client";

import { useState } from "react";
import {
  MoreVertical,
  AlertTriangle,
  Copy,
  ExternalLink,
  Check,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";

interface VideoType {
  id: string;
  name: string;
  uploadDate: string;
  status: "processing" | "completed" | "failed";
  processingStatus?: string; // Detailed status from backend
  priority: "high" | "medium" | "low";
  progress?: number;
  thumbnail: string;
  duration?: string;
  public_url?: string;
  original_url?: string;
  processed_url?: string;
}

interface VideoCardProps {
  video: VideoType;
  onDelete: (id: string) => void;
}

export function VideoCard({ video, onDelete }: VideoCardProps) {
  const [copying, setCopying] = useState<string | null>(null);

  // Use the data directly from the database
  const currentStatus = video.status;
  const currentProcessingStatus = video.processingStatus || "started";

  // Calculate progress based on processing status
  const getProgressFromStatus = () => {
    if (currentStatus === "completed") return 100;
    if (currentStatus === "failed") return 0;

    // If we have a specific progress value, use it
    if (typeof video.progress === "number" && video.progress > 0) {
      return video.progress;
    }

    // Otherwise calculate based on processing status
    switch (currentProcessingStatus) {
      case "started":
        return 10;
      case "downloading":
        return 20;
      case "uploading_original":
      case "original_upload_started":
        return 25;
      case "original_upload_completed":
        return 30;
      case "processing_started":
        return 40;
      case "converting":
        return 60;
      case "processing_completed":
        return 70;
      case "uploading_processed":
      case "processed_upload_started":
        return 80;
      case "processed_upload_completed":
        return 90;
      case "cleaning":
        return 95;
      case "completed":
        return 100;
      default:
        return 10;
    }
  };

  const progress = getProgressFromStatus();

  const copyToClipboard = async (text: string, type: string) => {
    if (!text) {
      console.error(`No ${type} URL to copy`);
      toast({
        title: "Copy Failed",
        description: `No ${type} URL available to copy.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
      toast({
        title: "URL Copied",
        description: `The ${type} video URL has been copied to your clipboard.`,
      });
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast({
        title: "Copy Failed",
        description: "Failed to copy URL to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Format the date properly, handling invalid dates
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Recently";
      }
      return date.toLocaleDateString();
    } catch (e) {
      return "Recently";
    }
  };

  // Get processing status text
  const getProcessingStatusText = () => {
    switch (currentProcessingStatus) {
      case "started":
        return "Processing started";
      case "downloading":
        return "Downloading video";
      case "uploading_original":
      case "original_upload_started":
        return "Uploading original video";
      case "original_upload_completed":
        return "Original video uploaded";
      case "processing_started":
        return "Processing video";
      case "converting":
        return "Converting video";
      case "processing_completed":
        return "Video processing completed";
      case "uploading_processed":
      case "processed_upload_started":
        return "Uploading processed video";
      case "processed_upload_completed":
        return "Processed video uploaded";
      case "cleaning":
        return "Cleaning up";
      case "completed":
        return "Processing completed";
      case "failed":
      case "processing_failed":
      case "original_upload_failed":
      case "processed_upload_failed":
        return "Processing failed";
      default:
        return "Processing";
    }
  };

  // Determine if a step is completed
  const isStepCompleted = (step: number) => {
    // If status is failed, no steps are completed
    if (currentStatus === "failed") return false;

    // Step 1: Original Video Uploaded
    if (step === 1) {
      return !!video.original_url;
    }

    // Step 2: Video Processing
    if (step === 2) {
      // Only completed if status is "completed"
      return currentStatus === "completed";
    }

    // Step 3: Processed Video Uploaded
    if (step === 3) {
      // Only completed if status is "completed" AND processed_url exists
      return currentStatus === "completed" && !!video.processed_url;
    }

    return false;
  };

  // Determine if a step is in progress
  const isStepInProgress = (step: number) => {
    // If status is completed or failed, no steps are in progress
    if (currentStatus === "completed" || currentStatus === "failed")
      return false;

    // Step 1: Original Video Uploaded
    if (step === 1) {
      return (
        [
          "started",
          "downloading",
          "uploading_original",
          "original_upload_started",
        ].includes(currentProcessingStatus) && !video.original_url
      );
    }

    // Step 2: Video Processing
    if (step === 2) {
      // In progress if original is uploaded but status is not completed
      return !!video.original_url && !isStepCompleted(2);
    }

    // Step 3: Processed Video Uploaded
    if (step === 3) {
      // In progress if step 2 is completed but step 3 is not
      return isStepCompleted(2) && !isStepCompleted(3);
    }

    return false;
  };

  // Get icon for a step
  const getStepIcon = (step: number) => {
    if (currentStatus === "failed") {
      return (
        <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
      );
    }

    if (isStepCompleted(step)) {
      return <Check className="h-5 w-5 text-green-500 flex-shrink-0" />;
    } else if (isStepInProgress(step)) {
      return (
        <Clock className="h-5 w-5 text-blue-500 animate-pulse flex-shrink-0" />
      );
    } else {
      return <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />;
    }
  };

  // Debug logging
  console.log("Video:", video.name);
  console.log("Status:", currentStatus);
  console.log("Processing Status:", currentProcessingStatus);
  console.log("Original URL:", video.original_url ? "Present" : "Not present");
  console.log(
    "Processed URL:",
    video.processed_url ? "Present" : "Not present"
  );
  console.log("Public URL:", video.public_url ? "Present" : "Not present");
  console.log("Step 1 completed:", isStepCompleted(1));
  console.log("Step 2 completed:", isStepCompleted(2));
  console.log("Step 3 completed:", isStepCompleted(3));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-4">
          <div className="relative h-[160px] w-[200px] flex-shrink-0 overflow-hidden rounded-md bg-gray-100 flex items-center justify-center">
            {video.thumbnail ? (
              <img
                src={video.thumbnail || "/placeholder.svg"}
                alt={video.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {currentStatus === "completed" && video.duration && (
              <div className="absolute bottom-2 right-2 rounded bg-black/70 px-1 py-0.5 text-xs text-white">
                {video.duration}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">{video.name}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Details</DropdownMenuItem>
                  {video.original_url && (
                    <>
                      <DropdownMenuItem asChild>
                        <a
                          href={video.original_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Original Video
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          // @ts-ignore
                          copyToClipboard(video.original_url, "original")
                        }
                      >
                        {copying === "original" ? (
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy Original URL
                      </DropdownMenuItem>
                    </>
                  )}
                  {video.processed_url && currentStatus === "completed" && (
                    <>
                      <DropdownMenuItem asChild>
                        <a
                          href={video.processed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Processed Video
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          // @ts-ignore
                          copyToClipboard(video.processed_url, "processed")
                        }
                      >
                        {copying === "processed" ? (
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="mr-2 h-4 w-4" />
                        )}
                        Copy Processed URL
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(video.id)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2 text-sm mb-3">
              <span className="text-muted-foreground">
                Uploaded {formatDate(video.uploadDate)}
              </span>
              <span className="text-muted-foreground">•</span>
              <Badge
                variant={
                  currentStatus === "completed"
                    ? "outline"
                    : currentStatus === "processing"
                    ? "secondary"
                    : "destructive"
                }
              >
                {currentStatus === "processing"
                  ? "Processing"
                  : currentStatus === "completed"
                  ? "Completed"
                  : "Failed"}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {video.priority} priority
              </Badge>
            </div>

            {/* Always show the three steps for all videos */}
            <div className="space-y-2 mt-2">
              {/* Step 1: Original Video Uploaded */}
              <div className="flex items-center gap-2">
                {getStepIcon(1)}
                <span className="text-sm">
                  Original Video Uploaded to Wasabi
                </span>
                {video.original_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs ml-auto"
                    onClick={() =>
                      // @ts-ignore
                      copyToClipboard(video.original_url, "original")
                    }
                  >
                    {copying === "original" ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy URL
                  </Button>
                )}
              </div>

              {/* Step 2: Video Processing */}
              <div className="flex items-center gap-2">
                {getStepIcon(2)}
                <span className="text-sm">Video Processing</span>
              </div>

              {/* Step 3: Processed Video Uploaded */}
              <div className="flex items-center gap-2">
                {getStepIcon(3)}
                <span className="text-sm">
                  Processed Video Uploaded to Wasabi
                </span>
                {video.processed_url && currentStatus === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs ml-auto"
                    onClick={() =>
                      // @ts-ignore
                      copyToClipboard(video.processed_url, "processed")
                    }
                  >
                    {copying === "processed" ? (
                      <Check className="h-3.5 w-3.5 mr-1 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    Copy URL
                  </Button>
                )}
              </div>
            </div>

            {/* Processing progress bar */}
            {currentStatus === "processing" && (
              <div className="space-y-1 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span>{getProcessingStatusText()}</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Failed status message */}
            {currentStatus === "failed" && (
              <div className="mt-3 text-sm text-destructive flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Processing failed. Please check logs or try re-uploading.
              </div>
            )}

            {/* View Video button for completed videos */}
            {video.original_url && (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-fit"
                  onClick={() => copyToClipboard(video.id, "Video ID")}
                >
                  {copying === "Video ID" ? (
                    <Check className="h-4 w-4 mr-1 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  Copy Video ID
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
