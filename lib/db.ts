import mysql from "mysql2/promise";

// Create a connection pool to the MySQL database
export const pool = mysql.createPool({
  host: process.env.NEXT_PUBLIC_MYSQL_HOST || "localhost",
  user: process.env.NEXT_PUBLIC_MYSQL_USER || "root",
  password: process.env.NEXT_PUBLIC_MYSQL_PASSWORD || "",
  database: process.env.NEXT_PUBLIC_MYSQL_DATABASE || "video_processor",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper function to execute SQL queries - no mock data, just real database queries
export async function query(sql: string, params: any[] = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error("Database query error:", error);
    throw error; // Re-throw the error so it can be handled by the caller
  }
}

// Database initialization script - just checks if tables exist
export async function initializeDatabase() {
  try {
    console.log("Checking database connection...");

    // Simple query to check if connection works
    await query("SELECT 1");

    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}
