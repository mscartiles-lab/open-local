/**
 * Waitlist reminder sweep.
 *
 * Runs once per day (wired into runDailySweep in index.ts).
 * For every waitlist entry that was invited but has NOT yet signed up as a
 * vendor, we send timed nudge emails:
 *
 *   day3  — 3 days after invitedAt
 *   day7  — 7 days after invitedAt
 *   day14 — 14 days after invitedAt (last-chance)
 *
 * "Has signed up" is determined by the presence of a vendor row whose
 * contactEmail matches the waitlist email (case-insensitive).
 *
 * Duplicate-send guard: each email type is recorded in waitlist.emailsSent
 * (JSONB array) using the same atomic update pattern as onboardingEmailsSent
 * on the vendors table.
 */

import { and, eq, sql, inArray } from "drizzle-orm";
import { db, waitlistTable, vendorsTable } from "@workspace/db";
import { sendDirectEmail } from "./email";
import { getAppUrl } from "./appUrl";
import { logger } from "./logger";

export type WaitlistReminderType = "day3" | "day7" | "day14";
export const WAITLIST_REMINDER_TYPES: WaitlistReminderType[] = ["day3", "day7", "day14"];

export interface WaitlistSweepResult {
  scanned: number;
  converted: number; // already signed up — skipped
  sent: Record<WaitlistReminderType, number>;
}

function daysSince(date: Date | null, now: Date = new Date()): number {
  if (!date) return 0;
  return Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
}

function reminderContent(
  type: WaitlistReminderType,
  name: string | null,
  signupUrl: string,
): { subject: string; message: string } {
  const greeting = name ? `Hi ${name},` : "Hi there,";
  switch (type) {
    case "day3":
      return {
        subject: "Still thinking it over? Your Open Local invite is waiting.",
        message: `${greeting}\n\nThree days ago you signed up for an invitation to Open Local — Florida's marketplace for local producers, bakers, farms, makers, and artisans.\n\nYour invitation is still active. It only takes a couple of minutes to create your listing and start reaching local shoppers.\n\nJoin Open Local:\n${signupUrl}\n\nLet us know if you have any questions — just reply to this email.\n\nThe Open Local team`,
      };
    case "day7":
      return {
        subject: "Your Open Local invitation — a quick note",
        message: `${greeting}\n\nA week ago you requested an invite to Open Local, but we haven't seen you on the other side yet.\n\nWe'd love to have you. Whether you're a baker, farmer, brewer, or maker — there are shoppers in your area already looking for what you make.\n\nGet started here (takes under 5 minutes):\n${signupUrl}\n\nThe Open Local team`,
      };
    case "day14":
      return {
        subject: "Last chance — your Open Local invitation",
        message: `${greeting}\n\nThis is our final nudge. Your Open Local invitation has been open for two weeks — we don't want you to miss out.\n\nIf now isn't the right time, no worries — you can always come back to ${signupUrl} whenever you're ready.\n\nIf there's something holding you back (technical issues, questions about how it works, or anything else), just reply and we'll personally help you get set up.\n\nThe Open Local team`,
      };
  }
}

/**
 * Atomically marks a waitlist email type as sent.
 * Returns true only if we won the race (i.e. it wasn't already in the array).
 */
async function recordWaitlistEmail(
  entryId: number,
  type: WaitlistReminderType,
): Promise<boolean> {
  const sentJson = sql`COALESCE(${waitlistTable.emailsSent}, '[]'::jsonb)`;
  const updated = await db
    .update(waitlistTable)
    .set({
      emailsSent: sql`${sentJson} || ${JSON.stringify([type])}::jsonb`,
    })
    .where(
      and(
        eq(waitlistTable.id, entryId),
        sql`NOT (${sentJson} ? ${type})`,
      ),
    )
    .returning({ id: waitlistTable.id });
  return updated.length > 0;
}

export async function runWaitlistReminderSweep(
  now: Date = new Date(),
): Promise<WaitlistSweepResult> {
  const signupUrl = `${getAppUrl()}/submit`;
  const counts: Record<WaitlistReminderType, number> = {
    day3: 0,
    day7: 0,
    day14: 0,
  };

  // Fetch all invited, non-unsubscribed waitlist entries
  const entries = await db
    .select()
    .from(waitlistTable)
    .where(
      and(
        eq(waitlistTable.status, "invited"),
        eq(waitlistTable.unsubscribed, false),
      ),
    );

  if (entries.length === 0) {
    return { scanned: 0, converted: 0, sent: counts };
  }

  // Find which emails have already signed up as a vendor
  const emails = entries.map((e) => e.email.toLowerCase());
  const convertedVendors = await db
    .select({ email: vendorsTable.contactEmail })
    .from(vendorsTable)
    .where(inArray(vendorsTable.contactEmail, emails));
  const convertedSet = new Set(
    convertedVendors.map((v) => v.email.toLowerCase()),
  );

  let converted = 0;

  for (const entry of entries) {
    const email = entry.email.toLowerCase();

    // Skip — already signed up as a vendor
    if (convertedSet.has(email)) {
      converted++;
      logger.debug(
        { email, id: entry.id },
        "[waitlist-sweep] skip — already converted to vendor",
      );
      continue;
    }

    const days = daysSince(entry.invitedAt, now);
    const sent = new Set<string>(entry.emailsSent ?? []);

    const toSend: WaitlistReminderType[] = [];
    if (days >= 14 && !sent.has("day14")) toSend.push("day14");
    else if (days >= 7 && !sent.has("day7")) toSend.push("day7");
    else if (days >= 3 && !sent.has("day3")) toSend.push("day3");

    for (const type of toSend) {
      const won = await recordWaitlistEmail(entry.id, type);
      if (!won) continue; // already sent in a concurrent run

      const content = reminderContent(type, entry.name, signupUrl);
      logger.info(
        { email, id: entry.id, type, days },
        `[waitlist-sweep] sending ${type} reminder`,
      );

      void sendDirectEmail({
        to: email,
        toName: entry.name ?? "there",
        subject: content.subject,
        message: content.message,
      }).catch((err) =>
        logger.error(
          { err, email, id: entry.id, type },
          "[waitlist-sweep] reminder send failed",
        ),
      );

      counts[type]++;
    }
  }

  const result: WaitlistSweepResult = {
    scanned: entries.length,
    converted,
    sent: counts,
  };
  logger.info(result, "[waitlist-sweep] complete");
  return result;
}
