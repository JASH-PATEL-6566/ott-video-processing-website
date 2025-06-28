// import { type NextRequest, NextResponse } from "next/server";
// import { getUserFromToken } from "@/lib/auth";

// export async function POST(request: NextRequest) {
//   try {
//     console.log("POST /api/video-url - Request received");

//     // Verify authentication
//     const authHeader = request.headers.get("authorization");
//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const token = authHeader.split(" ")[1];
//     const user = await getUserFromToken(token);

//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Parse request body
//     const body = await request.json();

//     // Validate required fields
//     if (!body.url) {
//       return NextResponse.json(
//         { error: "Video URL is required" },
//         { status: 400 }
//       );
//     }

//     // Prepare data for Lambda function
//     const lambdaPayload = {
//       url: body.url,
//       priority: body.priority || "medium",
//       filename: body.filename || null,
//       metadata: {
//         userId: user.id.toString(),
//         userEmail: user.email,
//         userName: user.name,
//         ...body.metadata,
//       },
//       timestamp: new Date().toISOString(),
//     };

//     // Get Lambda endpoint from environment variable
//     const lambdaEndpoint = process.env.NEXT_PUBLIC_VIDEO_URL_LAMBDA_ENDPOINT;
//     console.log(lambdaEndpoint);

//     if (!lambdaEndpoint) {
//       console.error("Lambda endpoint not configured");
//       return NextResponse.json(
//         { error: "Service configuration error" },
//         { status: 500 }
//       );
//     }

//     console.log(`Forwarding request to Lambda: ${lambdaEndpoint}`);

//     // Forward the request to AWS Lambda
//     const lambdaResponse = await fetch(lambdaEndpoint, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(lambdaPayload),
//     });

//     if (!lambdaResponse.ok) {
//       const errorText = await lambdaResponse.text();
//       console.error(
//         `Lambda returned error: ${lambdaResponse.status}`,
//         errorText
//       );

//       try {
//         const errorJson = JSON.parse(errorText);
//         return NextResponse.json(
//           { error: errorJson.error || "Error processing video URL" },
//           { status: lambdaResponse.status }
//         );
//       } catch (e) {
//         return NextResponse.json(
//           { error: "Error processing video URL" },
//           { status: lambdaResponse.status }
//         );
//       }
//     }

//     // Return the Lambda response
//     const lambdaResult = await lambdaResponse.json();

//     return NextResponse.json({
//       message: "Video URL submitted successfully",
//       jobId: lambdaResult.jobId || lambdaPayload.timestamp,
//     });
//   } catch (error) {
//     console.error("Error processing video URL:", error);
//     return NextResponse.json(
//       { error: "An error occurred while processing the video URL" },
//       { status: 500 }
//     );
//   }
// }
import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/video-url - Request received");

    // Verify authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.url) {
      return NextResponse.json(
        { error: "Video URL is required" },
        { status: 400 }
      );
    }

    // Ensure we have a video_id
    if (!body.id) {
      return NextResponse.json(
        { error: "Video ID is required" },
        { status: 400 }
      );
    }

    console.log(`Processing video URL with ID: ${body.id}`);

    // Prepare data for Lambda function
    const lambdaPayload = {
      id: body.id, // Include the video_id in the Lambda payload
      url: body.url,
      priority: body.priority || "medium",
      filename: body.filename || null,
      metadata: {
        userId: user.id.toString(),
        userEmail: user.email,
        userName: user.name,
        ...body.metadata,
      },
      timestamp: new Date().toISOString(),
    };

    // Get Lambda endpoint from environment variable
    const lambdaEndpoint = process.env.VIDEO_URL_LAMBDA_ENDPOINT;

    if (!lambdaEndpoint) {
      console.error("Lambda endpoint not configured");
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    console.log(`Forwarding request to Lambda: ${lambdaEndpoint}`);

    // Forward the request to AWS Lambda
    const lambdaResponse = await fetch(lambdaEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lambdaPayload),
    });

    if (!lambdaResponse.ok) {
      const errorText = await lambdaResponse.text();
      console.error(
        `Lambda returned error: ${lambdaResponse.status}`,
        errorText
      );

      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { error: errorJson.error || "Error processing video URL" },
          { status: lambdaResponse.status }
        );
      } catch (e) {
        return NextResponse.json(
          { error: "Error processing video URL" },
          { status: lambdaResponse.status }
        );
      }
    }

    // Return the Lambda response
    const lambdaResult = await lambdaResponse.json();

    return NextResponse.json({
      message: "Video URL submitted successfully",
      jobId: lambdaResult.jobId || body.id, // Use the video_id as the jobId if not provided by Lambda
    });
  } catch (error) {
    console.error("Error processing video URL:", error);
    return NextResponse.json(
      { error: "An error occurred while processing the video URL" },
      { status: 500 }
    );
  }
}
