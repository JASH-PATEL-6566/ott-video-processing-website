"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BarChart, Upload, Users, Video, Clock, Menu } from "lucide-react";

interface MobileMenuProps {
  userRole: string | null;
  currentPath: string;
}

export function MobileMenu({ userRole, currentPath }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  const routes = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: BarChart,
      active: currentPath === "/dashboard",
    },
    {
      name: "Upload Videos",
      path: "/dashboard/upload",
      icon: Upload,
      active: currentPath === "/dashboard/upload",
    },
    {
      name: "My Videos",
      path: "/dashboard/videos",
      icon: Video,
      active: currentPath === "/dashboard/videos",
    },
    ...(userRole === "admin"
      ? [
          {
            name: "User Management",
            path: "/dashboard/users",
            icon: Users,
            active: currentPath === "/dashboard/users",
          },
        ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0">
        <SheetHeader className="p-4 text-left border-b">
          <SheetTitle>
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
          </SheetTitle>
        </SheetHeader>
        <div className="py-4">
          <nav className="flex flex-col gap-1 px-2">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                onClick={() => setOpen(false)}
              >
                <Button
                  variant={route.active ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <route.icon className="h-5 w-5" />
                  {route.name}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
