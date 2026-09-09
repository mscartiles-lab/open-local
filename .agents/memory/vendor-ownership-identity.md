---
name: Vendor ownership identity
description: Durable rules for associating vendor listings with user accounts without relying on mutable contact email.
---

Vendor authorization and personal-dashboard lookup must use a nullable owner account identifier. Case-insensitive contact-email matching is retained only to backfill legacy listings that have no owner.

**Why:** Most production vendor-role accounts did not match a listing by email, so navigation and authorization silently failed when login email and listing contact email differed. Email is also a mutable contact field, not a stable ownership identity.

**How to apply:** New listings derive ownership from the authenticated account. Legacy exact-email matches may be claimed automatically. Other unowned listings require verification through the listing’s contact email before assigning ownership. Never replace an existing owner silently.

For dashboard-gate changes, browser-test the in-place transition after successful verification, not only the gated screen. The gated branch can hide hook-order and post-gate render errors until state changes without remounting.