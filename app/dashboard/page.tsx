"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Users,
  Video,
  Clock,
  AlertTriangle,
  Plus,
  Search,
  Filter,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoCard } from "@/components/video-card";

interface VideoType {
  id: string;
  name: string;
  uploadDate: string;
  status: "processing" | "completed" | "failed";
  priority: "high" | "medium" | "low";
  progress?: number;
  thumbnail: string;
  duration?: string;
  resolutions?: string[];
  user_name?: string;
  user_email?: string;
}

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [videos, setVideos] = useState<VideoType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVideos: 0,
    processingVideos: 0,
    storageUsed: "0 GB",
    failedVideos: 0,
    totalUsers: 0,
    systemAlerts: 0,
  });

  useEffect(() => {
    const role = localStorage.getItem("userRole");
    setUserRole(role);
    fetchVideos();
    fetchStats();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      // Check if token exists
      if (!token) {
        console.error("No token found");
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      try {
        // Use XMLHttpRequest instead of fetch to avoid stream-related issues
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
            console.error(
              "Failed to fetch videos:",
              xhr.status,
              xhr.statusText
            );
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
    } catch (error) {
      console.error("Error in fetchVideos:", error);
      setError(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");

      // Check if token exists
      if (!token) {
        console.error("No token found in localStorage");
        return;
      }

      console.log(
        "Token from localStorage (first 10 chars):",
        token.substring(0, 10) + "..."
      );

      // Use XMLHttpRequest instead of fetch
      const xhr = new XMLHttpRequest();
      xhr.open("GET", "/api/stats", true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "application/json");

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setStats(data);
          } catch (parseError) {
            console.error("Error parsing stats JSON:", parseError);
          }
        } else {
          console.error("Failed to fetch stats:", xhr.status, xhr.statusText);
        }
      };

      xhr.onerror = () => {
        console.error("Network error occurred while fetching stats");
      };

      xhr.send();
    } catch (error) {
      console.error("Error fetching stats:", error);
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
    <div className="flex flex-col gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVideos}</div>
            <p className="text-xs text-muted-foreground">
              Your uploaded videos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.processingVideos}</div>
            <p className="text-xs text-muted-foreground">
              Videos currently processing
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === "admin" ? "Total Users" : "Storage Used"}
            </CardTitle>
            {userRole === "admin" ? (
              <Users className="h-4 w-4 text-muted-foreground" />
            ) : (
              <BarChart className="h-4 w-4 text-muted-foreground" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRole === "admin" ? stats.totalUsers : stats.storageUsed}
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === "admin"
                ? "Active platform users"
                : "Total storage used"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {userRole === "admin" ? "System Alerts" : "Failed Videos"}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userRole === "admin" ? stats.systemAlerts : stats.failedVideos}
            </div>
            <p className="text-xs text-muted-foreground">
              {userRole === "admin" ? "Requires attention" : "Needs re-upload"}
            </p>
          </CardContent>
        </Card>
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

      <Tabs defaultValue="recent" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="recent">Recent Videos</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
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
            <Link href="/dashboard/upload">
              <Button size="sm" className="hidden md:flex">
                <Plus className="mr-2 h-4 w-4" />
                Upload Video
              </Button>
            </Link>
          </div>
        </div>
        <TabsContent value="recent" className="space-y-4">
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
                  onDelete={(id) => {
                    // This is a placeholder since the dashboard page doesn't have a delete handler
                    console.log("Delete video:", id);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <Video className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No videos found
                  </h3>
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
        </TabsContent>
        <TabsContent value="processing" className="space-y-4">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : videos.filter((video) => video.status === "processing").length >
              0 ? (
              videos
                .filter((video) => video.status === "processing")
                .map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onDelete={(id) => {
                      console.log("Delete video:", id);
                    }}
                  />
                ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No processing videos
                  </h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    You don't have any videos currently being processed.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="completed" className="space-y-4">
          <div className="grid gap-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : videos.filter((video) => video.status === "completed").length >
              0 ? (
              videos
                .filter((video) => video.status === "completed")
                .map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onDelete={(id) => {
                      console.log("Delete video:", id);
                    }}
                  />
                ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <Video className="h-10 w-10 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    No completed videos
                  </h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    You don't have any completed videos yet.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
