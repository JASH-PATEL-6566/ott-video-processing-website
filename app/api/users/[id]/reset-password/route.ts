import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const currentUser = await getUserFromToken(token)

    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can reset other users' passwords
    // Regular users can only reset their own password
    if (currentUser.role !== "admin" && currentUser.id.toString() !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { password, currentPassword } = await request.json()

    if (!password) {
      return NextResponse.json({ error: "New password is required" }, { status: 400 })
    }

    // If a regular user is resetting their own password, they need to provide their current password
    if (currentUser.role !== "admin" && currentUser.id.toString() === params.id) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required" }, { status: 400 })
      }

      // Verify current password
      const users = await query("SELECT password FROM users WHERE id = ?", [params.id])

      if (!Array.isArray(users) || users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const user = users[0] as any

      // In a real app, you would use bcrypt.compare
      // const passwordMatch = await bcrypt.compare(currentPassword, user.password);
      const passwordMatch = currentPassword === user.password

      if (!passwordMatch) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
    }

    // In a real app, you would hash the password
    // const hashedPassword = await hashPassword(password);
    const hashedPassword = password

    await query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resetting password:", error)
    return NextResponse.json({ error: "An error occurred while resetting the password" }, { status: 500 })
  }
}
