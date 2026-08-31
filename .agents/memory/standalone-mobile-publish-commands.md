---
name: Standalone mobile publish commands
description: How production commands must invoke the mobile artifact after excluding it from the pnpm workspace.
---

Production build and run commands for the standalone mobile artifact must explicitly target its package directory rather than relying on the current working directory.

**Why:** Application publishing runs the artifact commands from the project context. Plain package scripts can target the root package, leaving the mobile port unopened and causing the `/mobile/` startup check to fail.

**How to apply:** When changing mobile package-manager or workspace membership, keep production commands directory-qualified and verify the production server opens its assigned port and returns HTTP 200 at the mobile base path.