---
name: Schema-lag tolerant authentication
description: Keep critical authentication lookups operational during additive development-to-production schema drift.
---

Authentication lookups should project only the fields required for the current decision instead of selecting an entire evolving account row. Unhandled API errors must also be returned as JSON.

**Why:** An additive account field existed in application schema before the live database had the column. A full-row login lookup then failed before email delivery and Express returned its default HTML error page.

**How to apply:** Use narrow projections on login, session, and access-control reads when only a few stable fields are needed. Publish remains responsible for applying production schema changes; narrow reads are compatibility protection, not a replacement for migration.