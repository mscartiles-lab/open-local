import { useState } from "react";
import { Loader2, LifeBuoy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const SESSION_KEY = "ol_session";

interface CreatedTicket {
  reference: string;
  subject: string;
  status: string;
}

export default function SupportRequestForm() {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<CreatedTicket | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subject.trim().length < 3 || body.trim().length < 10) {
      toast({
        variant: "destructive",
        title: "Add a bit more detail",
        description: "Tell us the subject and describe the issue (10+ characters).",
      });
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      if (!token) {
        toast({
          variant: "destructive",
          title: "Please sign in",
          description: "You need to be signed in to submit a support request.",
        });
        return;
      }
      const r = await fetch("/api/support/tickets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      if (!r.ok) {
        const msg = await r.text().catch(() => `HTTP ${r.status}`);
        throw new Error(msg);
      }
      const ticket = (await r.json()) as CreatedTicket;
      setSubmitted(ticket);
      setSubject("");
      setBody("");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Couldn't submit your request",
        description: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900">
              We've got your request
            </h3>
            <p className="mt-1 text-sm text-emerald-800">
              Your reference number is{" "}
              <span className="font-mono font-semibold">{submitted.reference}</span>.
              You'll hear back from us within 24 hours — keep an eye on your inbox.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-emerald-900 hover:bg-emerald-100"
              onClick={() => setSubmitted(null)}
            >
              Submit another request
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex items-start gap-3">
        <LifeBuoy className="mt-1 h-5 w-5 text-primary" />
        <div className="flex-1">
          <h3 className="font-semibold">Get support</h3>
          <p className="text-sm text-muted-foreground">
            Trouble with your storefront, payouts, or something else? Tell us and
            we'll get back to you within 24 hours.
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="support-subject">
          Subject
        </label>
        <Input
          id="support-subject"
          placeholder="What do you need help with?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="support-body">
          Details
        </label>
        <Textarea
          id="support-body"
          placeholder="Tell us what's going on. The more detail, the faster we can help."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={5000}
          required
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit request
        </Button>
      </div>
    </form>
  );
}
