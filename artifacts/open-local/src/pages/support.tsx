import { LifeBuoy } from "lucide-react";
import SupportRequestForm from "@/components/SupportRequestForm";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  const { user, isLoading, openOnboarding } = useUser();

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            Contact support
          </h1>
          <p className="mt-1 text-muted-foreground">
            Need a hand with your account, an order, or a listing? Send us a
            note and we'll get back to you within 24 hours.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : user ? (
          <SupportRequestForm />
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Please sign in so we can match your request to your account.
            </p>
            <Button onClick={openOnboarding}>Sign in to continue</Button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Already have a reference number? Reply directly to the email we sent
        when you opened the ticket and we'll pick up the thread.
      </p>
    </div>
  );
}
