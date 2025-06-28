"use client";

import type React from "react";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // For preview/demo purposes, hardcode admin and user credentials
      if (email === "admin@example.com" && password === "admin123") {
        // Generate a mock token for demo purposes
        // This is a properly formatted JWT with a special signature that our auth system recognizes
        const mockToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
          "eyJzdWIiOiIxIiwiZW1haWwiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsIm5hbWUiOiJBZG1pbiBVc2VyIiwiaWF0IjoxNjE2MTYyMDAwLCJleHAiOjk5OTk5OTk5OTl9." +
          "mock-signature-for-demo";

        localStorage.setItem("userRole", "admin");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", "Admin User");
        localStorage.setItem("userId", "1");
        localStorage.setItem("token", mockToken);

        console.log(
          "Stored mock token for admin:",
          mockToken.substring(0, 20) + "..."
        );

        router.push("/dashboard");
        return;
      } else if (email === "user@example.com" && password === "user123") {
        // Generate a mock token for demo purposes
        const mockToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
          "eyJzdWIiOiIyIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6InVzZXIiLCJuYW1lIjoiUmVndWxhciBVc2VyIiwiaWF0IjoxNjE2MTYyMDAwLCJleHAiOjk5OTk5OTk5OTl9." +
          "mock-signature-for-demo";

        localStorage.setItem("userRole", "user");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userName", "Regular User");
        localStorage.setItem("userId", "2");
        localStorage.setItem("token", mockToken);

        console.log(
          "Stored mock token for user:",
          mockToken.substring(0, 20) + "..."
        );

        router.push("/dashboard");
        return;
      }

      // In a production environment, we would make an API call
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Login failed");
        }

        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("userEmail", data.user.email);
        localStorage.setItem("userName", data.user.name);
        localStorage.setItem("userId", data.user.id.toString());
        localStorage.setItem("token", data.token);

        router.push("/dashboard");
      } catch (apiError) {
        console.error("API error:", apiError);
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 font-bold text-xl">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6 text-primary"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
              Ananta Upload
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Login to your account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Button
                  variant="link"
                  className="p-0 h-auto font-normal text-sm"
                  asChild
                >
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(
                        "Please contact your administrator to reset your password."
                      );
                    }}
                  >
                    Forgot password?
                  </a>
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal">
                Remember me
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            <p>Demo credentials:</p>
            <p className="text-muted-foreground">
              Admin: admin@example.com / admin123
            </p>
            <p className="text-muted-foreground">
              User: user@example.com / user123
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Contact your administrator if you need an account
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
