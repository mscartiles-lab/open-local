# Vendor trial email templates

These are the HTML email templates n8n should send in response to the three
`vendor.trial.*` outbound webhooks fired by the Open Local API.

| Webhook event                       | When it fires                                                         | Template file                            |
| ----------------------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `vendor.trial.payment_prompt`       | T-8d (7 < `days_remaining` ≤ 8)                                       | `vendor-trial-payment-prompt.html`       |
| `vendor.trial.final_warning`        | T-1d (last 24h of the trial)                                          | `vendor-trial-final-warning.html`        |
| `vendor.trial.expired_paused`       | T+1d (≥24h after `trial_ends_at`, no active paid Stripe subscription) | `vendor-trial-expired-paused.html`       |

## Webhook payload shape

Every event posts the same envelope (Open Local signs the body with the
per-subscription secret in `X-OpenLocal-Signature: sha256=…`):

```json
{
  "user_id": 42,
  "email": "vendor@example.com",
  "username": "citrus_belt",
  "role": "vendor",
  "trial_started_at": "2026-03-15T18:32:00.000Z",
  "trial_ends_at":    "2026-04-14T18:32:00.000Z",
  "days_remaining": 8,
  "email_type": "payment_prompt",
  "has_payment_method": false,
  "stripe_customer_id": "cus_…",
  "stripe_subscription_id": "sub_…"
}
```

The `vendor.trial.expired_paused` event adds one extra field:

```json
{
  "reactivation_url": "https://openlocal.app/billing?reactivate=1"
}
```

## Placeholders used by the templates

| Placeholder            | Used in                                  |
| ---------------------- | ---------------------------------------- |
| `{{ username }}`       | All three templates                      |
| `{{ days_remaining }}` | `payment_prompt`                         |
| `{{ trial_ends_at }}`  | All three templates                      |
| `{{ reactivation_url }}` | `expired_paused`                       |

Format `trial_ends_at` in your n8n flow (e.g. with the `DateTime` node) before
substituting — the API sends an ISO-8601 timestamp, but shoppers will see
something like `April 14, 2026`.

## Suggested n8n flow per event

1. **Webhook** node listening on the matching path (e.g. `/webhook/vendor-trial-payment-prompt`).
2. **(Optional) Code** node to verify the `X-OpenLocal-Signature` HMAC against the subscription secret.
3. **Set / Code** node to format `trial_ends_at` into a human-readable date.
4. **Email** node (Resend, Postmark, SES, etc.) with the matching HTML template body and these subject lines:
   - `payment_prompt` → `Your Open Local trial ends in {{ days_remaining }} days`
   - `final_warning` → `Last day! Your Open Local trial ends tomorrow`
   - `expired_paused` → `Your Open Local storefront is paused — reactivate any time`

Open Local does not send these emails itself — it only fires the webhook with
all the data needed to render the message. This keeps email styling, deliverability,
and A/B testing fully in n8n's hands.
