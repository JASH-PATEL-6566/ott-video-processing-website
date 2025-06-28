"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Video, Search, Filter, Plus, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VideoCard } from "@/components/video-card";

interface VideoType {
  id: string;
  name: string;
  uploadDate: string;
  status: "processing" | "completed" | "failed";
  processingStatus?: string;
  priority: "high" | "medium" | "low";
  progress?: number;
  thumbnail: string;
  duration?: string;
  resolutions?: string[];
  public_url?: string;
  original_url?: string;
  processed_url?: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();

    // Set up a refresh interval to get the latest status from the database
    // const intervalId = setInterval(fetchVideos, 10000);

    // return () => clearInterval(intervalId);
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found. Please log in again.");
        console.error("No token found in localStorage");
        setIsLoading(false);
        return;
      }

      // Use XMLHttpRequest instead of fetch
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/videos", true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log("Fetched videos:", data.length);
            setVideos(data);
          } catch (parseError) {
            console.error(
              "Error parsing JSON:",
              parseError,
              "Response:",
              xhr.responseText
            );
            setError("Failed to parse server response");
          }
        } else {
          console.error("Failed to fetch videos:", xhr.status, xhr.statusText);
          setError(`Failed to fetch videos: ${xhr.status} ${xhr.statusText}`);
        }
        setIsLoading(false);
      };

      xhr.onerror = () => {
        console.error("Network error occurred");
        setError("Network error occurred while fetching videos");
        setIsLoading(false);
      };

      xhr.send();
    } catch (error) {
      console.error("Error fetching videos:", error);
      setError(
        `Error fetching videos: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setIsLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setVideoToDelete(videoId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVideo = async () => {
    if (videoToDelete) {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setError("No authentication token found. Please log in again.");
          setDeleteDialogOpen(false);
          setVideoToDelete(null);
          return;
        }

        // Find the video to get its S3 information
        const videoToDeleteObj = videos.find((v) => v.id === videoToDelete);

        // Use XMLHttpRequest for delete operation
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", `/api/videos/${videoToDelete}`, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            // If the video has S3 information and we need to delete from S3 as well
            if (videoToDeleteObj?.public_url) {
              try {
                // Delete from S3 if needed - this would be handled by your backend
                console.log(
                  "Video deleted from database, S3 object would be deleted at:",
                  videoToDeleteObj.public_url
                );
              } catch (s3Error) {
                console.error("Error deleting from S3:", s3Error);
                // Continue anyway since the database record is deleted
              }
            }

            setVideos(videos.filter((video) => video.id !== videoToDelete));
          } else {
            console.error(
              "Failed to delete video:",
              xhr.status,
              xhr.statusText
            );
            setError(`Failed to delete video: ${xhr.status} ${xhr.statusText}`);
          }
          setDeleteDialogOpen(false);
          setVideoToDelete(null);
        };

        xhr.onerror = () => {
          console.error("Network error occurred while deleting video");
          setError("Network error occurred while deleting video");
          setDeleteDialogOpen(false);
          setVideoToDelete(null);
        };

        xhr.send();
      } catch (error) {
        console.error("Error deleting video:", error);
        setError(
          `Error deleting video: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        setDeleteDialogOpen(false);
        setVideoToDelete(null);
      }
    }
  };

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFilter =
      activeFilter === "all" || video.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <>
      <div className="flex flex-col gap-4 md:gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">My Videos</h1>
          <p className="text-muted-foreground">
            Manage your uploaded videos, check processing status, and access
            completed videos.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium">Error</h3>
              <p className="text-sm">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null);
                  fetchVideos();
                }}
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search videos..."
                className="w-full rounded-md pl-8 md:w-[200px] lg:w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                  <span className="sr-only">Filter</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setActiveFilter("all")}>
                  All Videos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFilter("processing")}>
                  Processing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFilter("completed")}>
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFilter("failed")}>
                  Failed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Link href="/dashboard/upload">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Upload Video
            </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                onDelete={handleDeleteVideo}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                <Video className="h-10 w-10 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No videos found</h3>
                <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? "No videos match your search criteria. Try a different search term."
                    : "You haven't uploaded any videos yet. Start by uploading your first video."}
                </p>
                <Link href="/dashboard/upload">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Upload Video
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              video and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVideo}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
