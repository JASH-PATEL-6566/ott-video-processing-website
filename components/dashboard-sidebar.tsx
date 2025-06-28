"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { BarChart, Upload, Users, Video, Clock } from "lucide-react";

interface DashboardSidebarProps {
  userRole: string | null;
}

export function DashboardSidebar({ userRole }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="fixed inset-y-0 left-0 top-16 z-30 hidden w-64 transform bg-background shadow-lg transition-transform duration-200 ease-in-out md:block">
      <div className="flex h-full flex-col overflow-y-auto border-r pt-5">
        <div className="px-4">
          <nav className="flex flex-col space-y-1">
            <Link href="/dashboard">
              <Button
                variant={pathname === "/dashboard" ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <BarChart className="mr-2 h-5 w-5" />
                Dashboard
              </Button>
            </Link>
            <Link href="/dashboard/upload">
              <Button
                variant={
                  pathname === "/dashboard/upload" ? "secondary" : "ghost"
                }
                className="w-full justify-start"
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Videos
              </Button>
            </Link>
            <Link href="/dashboard/videos">
              <Button
                variant={
                  pathname === "/dashboard/videos" ? "secondary" : "ghost"
                }
                className="w-full justify-start"
              >
                <Video className="mr-2 h-5 w-5" />
                My Videos
              </Button>
            </Link>
            {userRole === "admin" && (
              <>
                <Link href="/dashboard/users">
                  <Button
                    variant={
                      pathname === "/dashboard/users" ? "secondary" : "ghost"
                    }
                    className="w-full justify-start"
                  >
                    <Users className="mr-2 h-5 w-5" />
                    User Management
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
