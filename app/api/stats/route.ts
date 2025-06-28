import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    // For admin users, get platform-wide stats
    if (user.role === "admin") {
      const totalVideos = await query("SELECT COUNT(*) as count FROM videos");
      const processingVideos = await query(
        "SELECT COUNT(*) as count FROM videos WHERE status = 'processing'"
      );
      const totalUsers = await query("SELECT COUNT(*) as count FROM users");
      const failedVideos = await query(
        "SELECT COUNT(*) as count FROM videos WHERE status = 'failed'"
      );

      // Calculate system alerts (this would be more complex in a real app)
      const systemAlerts = 0;

      return NextResponse.json({
        totalVideos: Array.isArray(totalVideos) ? totalVideos.length - 1 : 0,
        processingVideos: Array.isArray(processingVideos)
          ? processingVideos.length - 1
          : 0,
        totalUsers: Array.isArray(totalUsers) ? totalUsers.length : 0,
        failedVideos: Array.isArray(failedVideos) ? failedVideos.length : 0,
        systemAlerts,
        storageUsed: "0 GB", // This would be calculated in a real app
      });
    }
    // For regular users, get user-specific stats
    else {
      const totalVideos = await query(
        "SELECT COUNT(*) as count FROM videos WHERE user_id = ?",
        [user.id]
      );
      const processingVideos = await query(
        "SELECT COUNT(*) as count FROM videos WHERE user_id = ? AND status = 'processing'",
        [user.id]
      );
      const failedVideos = await query(
        "SELECT COUNT(*) as count FROM videos WHERE user_id = ? AND status = 'failed'",
        [user.id]
      );

      // Calculate storage used (this would be more complex in a real app)
      const storageUsed = "0 GB";

      return NextResponse.json({
        totalVideos: Array.isArray(totalVideos) ? totalVideos.length - 1 : 0,
        processingVideos: Array.isArray(processingVideos)
          ? processingVideos.length - 1
          : 0,
        failedVideos: Array.isArray(failedVideos) ? failedVideos.length - 1 : 0,
        storageUsed,
      });
    }
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching stats" },
      { status: 500 }
    );
  }
}
