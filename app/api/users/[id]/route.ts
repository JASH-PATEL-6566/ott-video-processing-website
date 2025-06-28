import { type NextRequest, NextResponse } from "next/server"
import { getUserFromToken } from "@/lib/auth"
import { query } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Regular users can only access their own data
    if (currentUser.role !== "admin" && currentUser.id.toString() !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const users = await query(
      `
      SELECT id, name, email, role, status, 
             DATE_FORMAT(last_active, '%Y-%m-%dT%H:%i:%s') as last_active,
             (SELECT COUNT(*) FROM videos WHERE user_id = users.id) as videos_uploaded
      FROM users
      WHERE id = ?
    `,
      [params.id],
    )

    if (!Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "An error occurred while fetching the user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Regular users can only update their own data and cannot change their role
    if (currentUser.role !== "admin" && currentUser.id.toString() !== params.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, email, role, status } = await request.json()

    // Check if email already exists for another user
    if (email) {
      const existingUsers = await query("SELECT * FROM users WHERE email = ? AND id != ?", [email, params.id])
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 })
      }
    }

    const updateFields = []
    const updateValues = []

    if (name) {
      updateFields.push("name = ?")
      updateValues.push(name)
    }

    if (email) {
      updateFields.push("email = ?")
      updateValues.push(email)
    }

    // Only admins can change roles and status
    if (currentUser.role === "admin") {
      if (role) {
        updateFields.push("role = ?")
        updateValues.push(role)
      }

      if (status) {
        updateFields.push("status = ?")
        updateValues.push(status)
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    // Add the user ID to the values array
    updateValues.push(params.id)

    await query(`UPDATE users SET ${updateFields.join(", ")} WHERE id = ?`, updateValues)

    const updatedUser = await query("SELECT id, name, email, role, status FROM users WHERE id = ?", [params.id])

    return NextResponse.json(updatedUser[0])
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "An error occurred while updating the user" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const currentUser = await getUserFromToken(token)

    if (!currentUser || currentUser.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Prevent deleting your own account
    if (currentUser.id.toString() === params.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    await query("DELETE FROM users WHERE id = ?", [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "An error occurred while deleting the user" }, { status: 500 })
  }
}
