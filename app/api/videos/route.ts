import type { NextRequest } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("GET /api/videos - Request received");

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      console.error("GET /api/videos - No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header is missing" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("GET /api/videos - Invalid authorization format");
      return new Response(
        JSON.stringify({
          error: "Authorization header must start with Bearer",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      console.error("GET /api/videos - Token is empty");
      return new Response(
        JSON.stringify({ error: "Token is missing in Authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "GET /api/videos - Verifying token:",
      token.substring(0, 10) + "..."
    );

    const user = await getUserFromToken(token);

    if (!user) {
      console.error("GET /api/videos - Invalid token or user not found");
      return new Response(
        JSON.stringify({ error: "Invalid token or user not found" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("GET /api/videos - User authenticated:", user.id, user.email);

    // Get search query parameter
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";

    // First, check if the public_url column exists
    try {
      // Check if the column exists in the database
      const columnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'videos' 
        AND COLUMN_NAME = 'public_url'
      `);

      const hasPublicUrlColumn =
        Array.isArray(columnsResult) && columnsResult.length > 0;

      console.log(
        "GET /api/videos - public_url column exists:",
        hasPublicUrlColumn
      );

      // Build the SQL query based on user role and available columns
      let sql = `
  SELECT v.id, v.name, v.status, v.processing_status, v.priority, v.progress, 
         DATE_FORMAT(v.upload_date, '%Y-%m-%dT%H:%i:%s') as upload_date,
         v.duration, v.thumbnail, v.user_id, v.original_url, v.processed_url,
         u.name as user_name, u.email as user_email
`;

      // Add public_url column only if it exists
      if (hasPublicUrlColumn) {
        sql += `, v.public_url`;
      }

      sql += `
        FROM videos v
        JOIN users u ON v.user_id = u.id
        WHERE v.name LIKE ?
      `;

      const params = [`%${search}%`];

      // Regular users can only see their own videos
      if (user.role !== "admin") {
        sql += " AND v.user_id = ?";
        params.push(user.id.toString());
      }

      sql += " ORDER BY v.upload_date DESC";

      console.log("GET /api/videos - Executing SQL:", sql.replace(/\s+/g, " "));
      console.log("GET /api/videos - SQL params:", params);

      const videos = await query(sql, params);

      console.log(
        "GET /api/videos - Query successful, found videos:",
        Array.isArray(videos) ? videos.length : 0
      );

      // Process each video
      if (Array.isArray(videos)) {
        for (const video of videos as any[]) {
          // If original_url or processed_url are not in the database, generate them from public_url
          if (!video.original_url && video.public_url) {
            video.original_url = `${video.public_url.split(".")[0]}_original.${
              video.public_url.split(".")[1]
            }`;
          }

          if (!video.processed_url && video.public_url) {
            video.processed_url = video.public_url;
          }

          // Add processing status based on video status
          if (video.status === "processing") {
            // Calculate progress based on processing_status if not provided
            if (video.progress === null || video.progress === undefined) {
              switch (video.processing_status) {
                case "started":
                  video.progress = 10;
                  break;
                case "downloading":
                  video.progress = 20;
                  break;
                case "uploading_original":
                case "original_upload_started":
                  video.progress = 30;
                  break;
                case "original_upload_completed":
                  video.progress = 40;
                  break;
                case "processing_started":
                case "converting":
                  video.progress = 60;
                  break;
                case "processing_completed":
                  video.progress = 70;
                  break;
                case "uploading_processed":
                case "processed_upload_started":
                  video.progress = 80;
                  break;
                case "processed_upload_completed":
                  video.progress = 90;
                  break;
                case "cleaning":
                  video.progress = 95;
                  break;
                case "completed":
                  video.progress = 100;
                  break;
                default:
                  video.progress = 0;
              }
            }
          }
        }
      }

      // Return a plain JSON response
      return new Response(JSON.stringify(videos), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError) {
      console.error("GET /api/videos - Database query error:", dbError);
      return new Response(
        JSON.stringify({
          error: "Database query failed",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("GET /api/videos - Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("POST /api/videos - Request received");

    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      console.error("POST /api/videos - No authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization header is missing" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error("POST /api/videos - Invalid authorization format");
      return new Response(
        JSON.stringify({
          error: "Authorization header must start with Bearer",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      console.error("POST /api/videos - Token is empty");
      return new Response(
        JSON.stringify({ error: "Token is missing in Authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "POST /api/videos - Verifying token:",
      token.substring(0, 10) + "..."
    );

    const user = await getUserFromToken(token);

    if (!user) {
      console.error("POST /api/videos - Invalid token or user not found");
      return new Response(
        JSON.stringify({ error: "Invalid token or user not found" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("POST /api/videos - User authenticated:", user.id, user.email);

    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      console.error(
        "POST /api/videos - Error parsing request body:",
        jsonError
      );
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "POST /api/videos - Request body:",
      JSON.stringify(requestBody)
    );

    const { id, name, priority, thumbnail, publicUrl } = requestBody;

    if (!name) {
      console.error("POST /api/videos - Video name is required");
      return new Response(JSON.stringify({ error: "Video name is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate UUID if provided
    if (
      id &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id
      )
    ) {
      console.error("POST /api/videos - Invalid UUID format");
      return new Response(JSON.stringify({ error: "Invalid UUID format" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      // Check if the public_url column exists
      const columnsResult = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'videos' 
        AND COLUMN_NAME = 'public_url'
      `);

      const hasPublicUrlColumn =
        Array.isArray(columnsResult) && columnsResult.length > 0;

      console.log(
        "POST /api/videos - public_url column exists:",
        hasPublicUrlColumn
      );

      // Build the insert query dynamically based on what we know exists
      console.log("POST /api/videos - Inserting new video record");
      const insertColumns = id
        ? ["id", "name", "user_id", "priority", "thumbnail"]
        : ["name", "user_id", "priority", "thumbnail"];
      const insertValues = id
        ? [id, name, user.id, priority || "medium", thumbnail || null]
        : [name, user.id, priority || "medium", thumbnail || null];
      const placeholders = id
        ? ["?", "?", "?", "?", "?"]
        : ["?", "?", "?", "?"];

      // Add public_url if the column exists or was just created
      if ((hasPublicUrlColumn || publicUrl) && publicUrl) {
        try {
          // Check again if the column exists after our attempt to add it
          const recheck = await query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'videos' 
            AND COLUMN_NAME = 'public_url'
          `);

          if (Array.isArray(recheck) && recheck.length > 0) {
            insertColumns.push("public_url");
            insertValues.push(publicUrl);
            placeholders.push("?");
          }
        } catch (recheckError) {
          console.error(
            "POST /api/videos - Error rechecking public_url column:",
            recheckError
          );
        }
      }

      const insertQuery = `INSERT INTO videos (${insertColumns.join(
        ", "
      )}) VALUES (${placeholders.join(", ")})`;
      console.log("POST /api/videos - Insert query:", insertQuery);

      let result;
      try {
        result = await query(insertQuery, insertValues);
      } catch (insertError) {
        console.error("POST /api/videos - Error inserting video:", insertError);
        return new Response(
          JSON.stringify({
            error: "Failed to insert video record",
            details:
              insertError instanceof Error
                ? insertError.message
                : String(insertError),
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Use the provided ID or get the inserted ID
      const videoId = id || (result as any).insertId;
      console.log("POST /api/videos - Video inserted with ID:", videoId);

      // Build a simple response with just the essential data
      const videoRecord = {
        id: videoId,
        name,
        status: "processing",
        priority: priority || "medium",
        public_url: publicUrl || null,
        upload_date: new Date().toISOString(),
      };

      // Return a plain JSON response
      return new Response(JSON.stringify(videoRecord), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (dbError) {
      console.error("POST /api/videos - Database error:", dbError);
      return new Response(
        JSON.stringify({
          error: "Database operation failed",
          details: dbError instanceof Error ? dbError.message : String(dbError),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("POST /api/videos - Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
