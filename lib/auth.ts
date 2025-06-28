import { jwtVerify, SignJWT } from "jose";
import { query } from "./db";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  status: "active" | "inactive";
}

// Make sure we have a consistent JWT_SECRET
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    (process.env.NODE_ENV === "development"
      ? "development_jwt_secret_key_not_for_production"
      : undefined)
);

// Add this check to warn about missing JWT_SECRET in production
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  console.warn(
    "WARNING: JWT_SECRET is not set in production environment. Using fallback secret is not secure!"
  );
}

// Enable debug mode for development
const DEBUG_JWT = process.env.NODE_ENV !== "production";

export async function login(email: string, password: string) {
  try {
    // For demo credentials, bypass database query
    if (
      (email === "admin@example.com" && password === "admin123") ||
      (email === "user@example.com" && password === "user123")
    ) {
      const isAdmin = email === "admin@example.com";

      const user = {
        id: isAdmin ? 1 : 2,
        email: email,
        name: isAdmin ? "Admin User" : "Regular User",
        role: isAdmin ? "admin" : "user",
        status: "active",
      };

      // Create a JWT token
      const token = await new SignJWT({
        sub: user.id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(JWT_SECRET);

      return { user, token };
    }

    const users = await query("SELECT * FROM users WHERE email = ?", [email]);

    if (!Array.isArray(users) || users.length === 0) {
      return null;
    }

    const user = users[0] as any;

    // In a real app, you would use bcrypt.compare to check the password
    // For demo purposes, we're doing a simple comparison
    // const passwordMatch = await bcrypt.compare(password, user.password);
    const passwordMatch = password === user.password;

    if (!passwordMatch) {
      return null;
    }

    // Update last_active timestamp
    await query(
      "UPDATE users SET last_active = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    // Create a JWT token
    const token = await new SignJWT({
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      name: user.name,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      token,
    };
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

// Add this function to help debug JWT issues
async function debugJwtToken(token: string | undefined) {
  if (DEBUG_JWT) {
    try {
      if (!token) {
        console.log("Token is undefined");
        return;
      }

      // Just decode without verification to see what's in the token
      const parts = token.split(".");
      if (parts.length !== 3) {
        console.log("Token does not have three parts");
        return;
      }

      try {
        const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString());
        // console.log("Decoded JWT payload (not verified):", decoded);

        // Check expiration
        if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
          console.log("Token is expired");
        }

        // Log JWT secret info (not the actual secret)
        // console.log("JWT_SECRET exists:", !!JWT_SECRET);
        // console.log("JWT_SECRET length:", JWT_SECRET ? JWT_SECRET.length : 0);
      } catch (e) {
        console.log("Could not decode token payload:", e.message);
      }
    } catch (e) {
      console.log("Could not decode token for debugging:", e.message);
    }
  }
}

// Helper function to check if a token is a mock demo token
function isMockDemoToken(token: string): boolean {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Check if the signature part contains our mock signature identifier
    return parts[2] === "mock-signature-for-demo";
  } catch (e) {
    return false;
  }
}

// Helper function to extract payload from a mock token
function extractMockTokenPayload(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return payload;
  } catch (e) {
    console.error("Error extracting mock token payload:", e);
    return null;
  }
}

export async function verifyToken(token: string | undefined) {
  try {
    // Add debug info in development
    if (DEBUG_JWT) {
      await debugJwtToken(token);
    }

    // Check if token is undefined or empty
    if (!token) {
      console.error("Token is undefined or empty");
      return null;
    }

    // Special handling for mock demo tokens
    if (isMockDemoToken(token)) {
      if (DEBUG_JWT)
        console.log(
          "Detected mock demo token, bypassing signature verification"
        );

      const payload = extractMockTokenPayload(token);
      if (!payload || !payload.sub) {
        console.error("Invalid mock token payload");
        return null;
      }

      // For demo credentials, return the user info from the token
      return {
        id: Number.parseInt(payload.sub),
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as "admin" | "user",
        status: "active",
      };
    }

    // Regular JWT verification for non-mock tokens
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (!payload.sub) {
      return null;
    }

    // For demo credentials, bypass database query
    if (
      payload.email === "admin@example.com" ||
      payload.email === "user@example.com"
    ) {
      return {
        id: payload.email === "admin@example.com" ? 1 : 2,
        email: payload.email as string,
        name: payload.name as string,
        role: payload.role as "admin" | "user",
        status: "active",
      };
    }

    const users = await query("SELECT * FROM users WHERE id = ?", [
      payload.sub,
    ]);

    if (!Array.isArray(users) || users.length === 0) {
      return null;
    }

    const user = users[0] as any;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}

export async function getUserFromToken(token: string) {
  return await verifyToken(token);
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}
