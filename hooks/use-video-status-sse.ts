"use client";

import { useState, useEffect } from "react";

interface StatusUpdate {
  id: string;
  status: string;
  processingStatus: string;
  timestamp: number;
}

export function useVideoStatusSSE(
  videoId: string,
  initialStatus: string,
  initialProcessingStatus: string
) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [processingStatus, setProcessingStatus] = useState<string>(
    initialProcessingStatus
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only set up SSE if the video is still processing
    if (initialStatus !== "processing") return;

    let eventSource: EventSource | null = null;

    const connectSSE = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication token not found");
          return;
        }

        // Create the SSE connection
        const url = `/api/status-events/${videoId}?token=${token}`;
        eventSource = new EventSource(url);

        eventSource.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as StatusUpdate;
            setStatus(data.status);
            setProcessingStatus(data.processingStatus);

            // If the video is completed or failed, close the connection
            if (data.status === "completed" || data.status === "failed") {
              eventSource?.close();
              setIsConnected(false);
            }
          } catch (err) {
            console.error("Error parsing SSE message:", err);
          }
        };

        eventSource.onerror = (err) => {
          console.error("SSE connection error:", err);
          setError("Connection error");
          setIsConnected(false);

          // Try to reconnect after a delay
          setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        console.error("Error setting up SSE:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to connect to status updates"
        );
      }
    };

    connectSSE();

    // Clean up on unmount
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [videoId, initialStatus, initialProcessingStatus]);

  return { status, processingStatus, isConnected, error };
}
