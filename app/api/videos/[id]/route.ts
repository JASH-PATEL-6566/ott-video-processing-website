// import { type NextRequest, NextResponse } from "next/server";
// import { getUserFromToken } from "@/lib/auth";
// import { query } from "@/lib/db";

// export async function GET(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const authHeader = request.headers.get("authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const token = authHeader.split(" ")[1];
//     const user = await getUserFromToken(token);

//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Check if the public_url column exists
//     const columnsResult = await query(`
//       SELECT COLUMN_NAME
//       FROM INFORMATION_SCHEMA.COLUMNS
//       WHERE TABLE_SCHEMA = DATABASE()
//       AND TABLE_NAME = 'videos'
//       AND COLUMN_NAME = 'public_url'
//     `);

//     const hasPublicUrlColumn =
//       Array.isArray(columnsResult) && columnsResult.length > 0;

//     // Build the SQL query based on available columns
//     let sql = `
//       SELECT v.id, v.name, v.status, v.priority, v.progress,
//              DATE_FORMAT(v.upload_date, '%Y-%m-%dT%H:%i:%s') as upload_date,
//              v.duration, v.thumbnail, v.user_id, v.folder_path,
//              u.name as user_name, u.email as user_email
//     `;

//     // Add public_url column only if it exists
//     if (hasPublicUrlColumn) {
//       sql += `, v.public_url`;
//     }

//     sql += `
//       FROM videos v
//       JOIN users u ON v.user_id = u.id
//       WHERE v.id = ?
//     `;

//     const videos = await query(sql, [params.id]);

//     if (!Array.isArray(videos) || videos.length === 0) {
//       return NextResponse.json({ error: "Video not found" }, { status: 404 });
//     }

//     const video = videos[0] as any;

//     // Regular users can only access their own videos
//     if (
//       user.role !== "admin" &&
//       video.user_id.toString() !== user.id.toString()
//     ) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Get resolutions
//     const resolutions = await query(
//       "SELECT resolution, path FROM video_resolutions WHERE video_id = ?",
//       [params.id]
//     );

//     video.resolutions = resolutions;

//     return NextResponse.json(video);
//   } catch (error) {
//     console.error("Error fetching video:", error);
//     return NextResponse.json(
//       { error: "An error occurred while fetching the video" },
//       { status: 500 }
//     );
//   }
// }

// export async function DELETE(
//   request: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const authHeader = request.headers.get("authorization");

//     if (!authHeader || !authHeader.startsWith("Bearer ")) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const token = authHeader.split(" ")[1];
//     const user = await getUserFromToken(token);

//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Check if the video exists and belongs to the user
//     const videos = await query("SELECT user_id FROM videos WHERE id = ?", [
//       params.id,
//     ]);

//     if (!Array.isArray(videos) || videos.length === 0) {
//       return NextResponse.json({ error: "Video not found" }, { status: 404 });
//     }

//     const video = videos[0] as any;

//     // Regular users can only delete their own videos
//     if (
//       user.role !== "admin" &&
//       video.user_id.toString() !== user.id.toString()
//     ) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     // Delete the video
//     await query("DELETE FROM videos WHERE id = ?", [params.id]);

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Error deleting video:", error);
//     return NextResponse.json(
//       { error: "An error occurred while deleting the video" },
//       { status: 500 }
//     );
//   }
// }
import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Build the SQL query based on available columns
    let sql = `
      SELECT v.id, v.name, v.status, v.priority, v.progress, 
             DATE_FORMAT(v.upload_date, '%Y-%m-%dT%H:%i:%s') as upload_date,
             v.duration, v.thumbnail, v.user_id, v.folder_path,
             u.name as user_name, u.email as user_email
    `;

    // Add public_url column only if it exists
    if (hasPublicUrlColumn) {
      sql += `, v.public_url`;
    }

    sql += `
      FROM videos v
      JOIN users u ON v.user_id = u.id
      WHERE v.id = ?
    `;

    const videos = await query(sql, [params.id]);

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

    // Get resolutions
    const resolutions = await query(
      "SELECT resolution, path FROM video_resolutions WHERE video_id = ?",
      [params.id]
    );

    video.resolutions = resolutions;

    return NextResponse.json(video);
  } catch (error) {
    console.error("Error fetching video:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching the video" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = await getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the video exists and belongs to the user
    const videos = await query("SELECT user_id FROM videos WHERE id = ?", [
      params.id,
    ]);

    if (!Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videos[0] as any;

    // Regular users can only delete their own videos
    if (
      user.role !== "admin" &&
      video.user_id.toString() !== user.id.toString()
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the video
    await query("DELETE FROM videos WHERE id = ?", [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting video:", error);
    return NextResponse.json(
      { error: "An error occurred while deleting the video" },
      { status: 500 }
    );
  }
}
