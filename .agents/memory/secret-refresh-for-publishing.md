---
name: Secret refresh for publishing
description: How to handle a Replit Secret update that is not visible to an already-running task shell.
---

An already-running task shell can retain the secret values it received when the process started, even after the user replaces a Replit Secret.

**Why:** Rechecking a newly saved credential from the same shell can incorrectly report the old credential as still invalid. A newly started managed workflow receives the current secret and can confirm whether the replacement works.

**How to apply:** Validate credentials only by non-sensitive status responses. If a replaced secret remains stale in the task shell, use a fresh managed process or a new session; never print, copy, or embed the secret.