---
name: Safe Metro image dimensions
description: Why Metro uses a local safe image-dimension compatibility provider instead of image-size.
---

Do not use any registry release of `image-size` as Metro's image-dimension provider.

**Why:** The advisory covers every released `image-size` version through 2.0.2. Metro requires a synchronous provider that accepts both raw binary data and filesystem paths across its complete supported image set, so a version-only upgrade is not compatible.

**How to apply:** Keep a bounded provider for Metro's supported formats only, and verify raw-buffer and path inputs plus both iOS and Android Expo bundles after dependency changes.