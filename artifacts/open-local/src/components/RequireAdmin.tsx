import { type ReactNode } from "react";
import { Link } from "wouter";
import { Loader2, ShieldX } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useUser();
  const isAdmin = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <ShieldX className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 font-serif text-3xl font-bold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">
            This area is only available to Open Local platform administrators.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
