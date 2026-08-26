import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        title: t("support.addMoreDetail"),
        description: t("support.detailHint"),
      });
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem(SESSION_KEY);
      if (!token) {
        toast({
          variant: "destructive",
          title: t("support.signInRequired"),
          description: t("support.signInHint"),
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
        title: t("support.submitError"),
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
              {t("support.requestReceived")}
            </h3>
            <p className="mt-1 text-sm text-emerald-800">
              {t("support.referenceNumber")}{" "}
              <span className="font-mono font-semibold">{submitted.reference}</span>.
              {" "}{t("support.hearBack")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-emerald-900 hover:bg-emerald-100"
              onClick={() => setSubmitted(null)}
            >
              {t("support.submitAnother")}
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
          <h3 className="font-semibold">{t("support.getSupport")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("support.description")}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="support-subject">
          {t("support.subjectLabel")}
        </label>
        <Input
          id="support-subject"
          placeholder={t("support.subjectPlaceholder")}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          required
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-semibold" htmlFor="support-body">
          {t("support.detailsLabel")}
        </label>
        <Textarea
          id="support-body"
          placeholder={t("support.bodyPlaceholder")}
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
          {t("support.submitRequest")}
        </Button>
      </div>
    </form>
  );
}
