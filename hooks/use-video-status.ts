"use client";

// This hook is no longer needed since we're reading directly from the database
// But we'll keep a simplified version for backward compatibility
export function useVideoStatus(
  videoId: string,
  initialStatus: string,
  initialProcessingStatus: string
) {
  return {
    status: initialStatus,
    processingStatus: initialProcessingStatus,
    isLoading: false,
    error: null,
  };
}
