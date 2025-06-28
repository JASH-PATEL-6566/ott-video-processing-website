import type { NextRequest } from "next/server";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import { query } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

// SQS configuration
const STATUS_QUEUE_URL = process.env.STATUS_QUEUE_URL || "";
const AWS_REGION = process.env.AWS_REGION || "ca-central-1";

// Initialize SQS client
const sqsClient = new SQSClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const videoId = params.id;

  // Authenticate the user
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  const user = await getUserFromToken(token);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Get the video to check if the user has access
  const videos = await query("SELECT * FROM videos WHERE id = ?", [videoId]);

  if (!Array.isArray(videos) || videos.length === 0) {
    return new Response("Video not found", { status: 404 });
  }

  const video = videos[0] as any;

  // Regular users can only access their own videos
  if (
    user.role !== "admin" &&
    video.user_id.toString() !== user.id.toString()
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Set up SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            id: videoId,
            status: video.status,
            processingStatus: video.processing_status || "started",
            timestamp: Date.now(),
          })}\n\n`
        )
      );

      // Only continue polling if the video is still processing
      if (video.status !== "processing") {
        controller.close();
        return;
      }

      // Function to poll SQS
      const pollSQS = async () => {
        try {
          // Receive messages from SQS
          const receiveParams = {
            QueueUrl: STATUS_QUEUE_URL,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 1,
          };

          const receiveCommand = new ReceiveMessageCommand(receiveParams);
          const response = await sqsClient.send(receiveCommand);

          if (response.Messages && response.Messages.length > 0) {
            for (const message of response.Messages) {
              try {
                if (!message.Body) continue;

                const statusUpdate = JSON.parse(message.Body);

                // Extract the video key from the message
                const { video_key, event_type } = statusUpdate;

                if (!video_key) continue;

                // Check if this message is for our video
                const keyParts = video_key.split("/");
                const fileName = keyParts[keyParts.length - 1];

                if (
                  video.name.includes(fileName) ||
                  fileName.includes(video.name)
                ) {
                  // Map event_type to our database status
                  let status = "processing";
                  let processingStatus = event_type;

                  if (
                    event_type === "processing_completed" ||
                    event_type === "processed_upload_completed"
                  ) {
                    status = "completed";
                    processingStatus = "completed";
                  } else if (
                    event_type === "processing_failed" ||
                    event_type === "original_upload_failed" ||
                    event_type === "processed_upload_failed"
                  ) {
                    status = "failed";
                    processingStatus = "failed";
                  }

                  // Update the video status in the database
                  await query(
                    "UPDATE videos SET status = ?, processing_status = ?, last_updated = NOW() WHERE id = ?",
                    [status, processingStatus, videoId]
                  );

                  // Add additional data if available
                  if (statusUpdate.wasabi_url) {
                    await query(
                      "UPDATE videos SET original_url = ? WHERE id = ?",
                      [statusUpdate.wasabi_url, videoId]
                    );
                  }

                  if (statusUpdate.master_playlist_url) {
                    await query(
                      "UPDATE videos SET processed_url = ? WHERE id = ?",
                      [statusUpdate.master_playlist_url, videoId]
                    );
                  }

                  if (statusUpdate.trickplay_image_url) {
                    await query(
                      "UPDATE videos SET thumbnail = ? WHERE id = ?",
                      [statusUpdate.trickplay_image_url, videoId]
                    );
                  }

                  // Send update to client
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({
                        id: videoId,
                        status,
                        processingStatus,
                        timestamp: Date.now(),
                      })}\n\n`
                    )
                  );

                  // If the video is completed or failed, close the stream
                  if (status === "completed" || status === "failed") {
                    controller.close();
                    return;
                  }

                  // Delete the message from the queue
                  if (message.ReceiptHandle) {
                    const deleteParams = {
                      QueueUrl: STATUS_QUEUE_URL,
                      ReceiptHandle: message.ReceiptHandle,
                    };

                    const deleteCommand = new DeleteMessageCommand(
                      deleteParams
                    );
                    await sqsClient.send(deleteCommand);
                  }
                }
              } catch (messageError) {
                console.error("Error processing message:", messageError);
              }
            }
          }
        } catch (error) {
          console.error("Error polling SQS:", error);
          controller.error(error);
        }
      };

      // Poll SQS every 5 seconds
      const intervalId = setInterval(pollSQS, 5000);

      // Clean up when the client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
