
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, LayoutDashboard, History, Users, LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { AuthDialog } from "./dialogs/auth-dialog";
import { HouseholdDialog } from "./dialogs/household-dialog";
import { Button } from "./ui/button";
import { Chrome } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useState, useEffect } from "react";
import { FirestoreService, UserData } from "@/lib/firestore";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, signInWithGoogle } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/history", label: "History", icon: History },
    // Conditional household item - will be added dynamically
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        try {
          const data = await FirestoreService.getUserData(user.uid);
          setUserData(data);
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      };
      loadUserData();
    } else {
      setUserData(null);
    }
  }, [user]);

  // Function to refresh user data (can be called from other components)
  const refreshUserData = async () => {
    if (user) {
      try {
        const data = await FirestoreService.getUserData(user.uid);
        setUserData(data);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  };

  // Listen for route changes to refresh data
  useEffect(() => {
    refreshUserData();
  }, [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="container mx-auto flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b border-border/50">
        <Link href="/" className="flex items-center gap-2">
          <span className="hidden md:block text-lg font-semibold">Paisa View</span>
        </Link>
        
        {/* Navigation Items - Center (Desktop) */}
        <div className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-primary"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          
          <Link
            href="/household"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              pathname === "/household" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-primary"
            )}
          >
            <Users className="h-4 w-4" />
            Household
          </Link>
          
          <Link
            href="/history"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium",
              pathname === "/history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-primary"
            )}
          >
            <History className="h-4 w-4" />
            History
          </Link>
        </div>

        {/* Mobile Navigation - Center (Mobile Only) */}
        <div className="flex md:hidden items-center justify-between w-full">
          {/* Dashboard - Left */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-24",
              pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          
          {/* Household - Center */}
          <Link
            href="/household"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-24",
              pathname === "/household" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs font-medium">Household</span>
          </Link>
          
          {/* History - Right */}
          <Link
            href="/history"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors w-24",
              pathname === "/history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            )}
          >
            <History className="h-5 w-5" />
            <span className="text-xs font-medium">History</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>

              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium">{user.displayName || "User"}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex gap-2">
              {/* Desktop: Show Google sign-in and Sign In button */}
              <div className="hidden md:flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signInWithGoogle}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Sign in with Google
                </Button>
                <AuthDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      Sign In
                    </Button>
                  }
                  defaultMode="signin"
                />
              </div>
              
              {/* Mobile: Show auth button only when not signed in */}
              {!user && (
                <div className="md:hidden">
                  <Button asChild size="icon" variant="outline">
                    <Link href="/auth">
                      <User className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
