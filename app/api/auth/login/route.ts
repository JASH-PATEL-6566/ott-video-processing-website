import { type NextRequest, NextResponse } from "next/server"
import { login } from "@/lib/auth"
import { initializeDatabase } from "@/lib/db"

// Initialize the database when the server starts
initializeDatabase().catch(console.error)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const result = await login(email, password)

    if (!result) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const { user, token } = result

    // In a real app, you would set an HTTP-only cookie here
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token,
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "An error occurred during login" }, { status: 500 })
  }
}
