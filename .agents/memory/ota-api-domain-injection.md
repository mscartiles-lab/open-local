---
name: OTA API domain injection
description: Ensures Expo over-the-air releases retain the mobile app's production API base URL.
---

Set `EXPO_PUBLIC_DOMAIN` in the shared Replit environment and inject it explicitly for every OTA publish that bundles the mobile app. Treat each OTA as a full app export, not an environment-only patch.

**Why:** Build-profile environment declarations apply to native build jobs, but an OTA publish can run without that value and compile an unusable API base URL into the release.

**How to apply:** Before publishing an OTA, confirm the shared value is configured and include the production domain in the publish environment. Review the complete mobile working tree and its clean/uncommitted state. After publishing, inspect the Hermes bytecode or equivalent compiled artifact to confirm the API-base construction uses the expected hostname rather than an undefined value.