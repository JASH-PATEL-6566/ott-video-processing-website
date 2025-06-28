import { type NextRequest, NextResponse } from "next/server";
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
  try {
    // Authenticate the user
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the video to check if the user has access
    const videos = await query("SELECT * FROM videos WHERE id = ?", [
      params.id,
    ]);

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videos[0] as any;

    // Regular users can only access their own videos
    if (
      user.role !== "admin" &&
      video.user_id.toString() !== user.id.toString()
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the video is already completed or failed
    if (video.status !== "processing") {
      return NextResponse.json({ updated: false, status: video.status });
    }

    // Poll SQS for messages related to this video
    console.log(`Checking SQS for updates for video ${params.id}...`);

    // Receive messages from SQS
    const receiveParams = {
      QueueUrl: STATUS_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1, // Short wait time for API response
      MessageAttributeNames: ["All"],
    };

    const receiveCommand = new ReceiveMessageCommand(receiveParams);
    const response = await sqsClient.send(receiveCommand);

    let updated = false;
    let newStatus = video.status;
    let newProcessingStatus = video.processing_status || "started";

    if (response.Messages && response.Messages.length > 0) {
      console.log(`Received ${response.Messages.length} messages from SQS`);

      // Process each message
      for (const message of response.Messages) {
        try {
          if (!message.Body) continue;

          const statusUpdate = JSON.parse(message.Body);

          // Extract the video key from the message
          const { video_key, event_type } = statusUpdate;

          if (!video_key) continue;

          // Check if this message is for our video
          // Extract the filename from the key and compare with our video name
          const keyParts = video_key.split("/");
          const fileName = keyParts[keyParts.length - 1];

          // Check if this message is for our video
          // This is a simplified check - in a real app, you'd have a more reliable way to match videos
          if (video.name.includes(fileName) || fileName.includes(video.name)) {
            console.log(`Found update for video ${params.id}: ${event_type}`);

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
              [status, processingStatus, params.id]
            );

            // Add additional data if available
            if (statusUpdate.wasabi_url) {
              await query("UPDATE videos SET original_url = ? WHERE id = ?", [
                statusUpdate.wasabi_url,
                params.id,
              ]);
            }

            if (statusUpdate.master_playlist_url) {
              await query("UPDATE videos SET processed_url = ? WHERE id = ?", [
                statusUpdate.master_playlist_url,
                params.id,
              ]);
            }

            if (statusUpdate.trickplay_image_url) {
              await query("UPDATE videos SET thumbnail = ? WHERE id = ?", [
                statusUpdate.trickplay_image_url,
                params.id,
              ]);
            }

            updated = true;
            newStatus = status;
            newProcessingStatus = processingStatus;

            // Delete the message from the queue
            if (message.ReceiptHandle) {
              const deleteParams = {
                QueueUrl: STATUS_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              };

              const deleteCommand = new DeleteMessageCommand(deleteParams);
              await sqsClient.send(deleteCommand);
              console.log("Deleted message from queue");
            }
          }
        } catch (messageError) {
          console.error("Error processing message:", messageError);
        }
      }
    }

    return NextResponse.json({
      updated,
      status: newStatus,
      processingStatus: newProcessingStatus,
    });
  } catch (error) {
    console.error("Error checking status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}
