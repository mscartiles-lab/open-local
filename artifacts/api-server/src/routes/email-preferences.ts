import { Router, type IRouter, type Request, type Response } from "express";
import {
  unsubscribeEmail,
  verifyUnsubscribeToken,
} from "../lib/emailPreferences";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function page(title: string, message: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p><p><a href="/">Return to Open Local</a></p></main></body></html>`;
}

async function handleUnsubscribe(req: Request, res: Response): Promise<void> {
  const rawToken = typeof req.query.token === "string" ? req.query.token : "";
  const email = rawToken ? verifyUnsubscribeToken(rawToken) : null;
  if (!email) {
    res
      .status(400)
      .type("html")
      .send(page("Invalid unsubscribe link", "This unsubscribe link is invalid."));
    return;
  }

  await unsubscribeEmail(email);
  logger.info({ email }, "[email] recipient unsubscribed from non-essential email");
  res
    .status(200)
    .type("html")
    .send(
      page(
        "You’re unsubscribed",
        "Open Local will no longer send non-essential email to this address. Account verification and security messages may still be sent when requested.",
      ),
    );
}

router.get("/email/unsubscribe", handleUnsubscribe);
router.post("/email/unsubscribe", handleUnsubscribe);

export default router;