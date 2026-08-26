---
name: Expo native-map web bundling
description: Preventing Metro web builds from traversing react-native-maps in an Expo project.
---

**Rule:** Do not rely on a `Platform.OS` guard or conditional `require()` in a shared module to exclude `react-native-maps` from the web bundle. Put the native implementation in a `.native.tsx` module and provide a `.web.tsx` fallback.

**Why:** Metro statically follows the native-map dependency while bundling for web, even when the runtime branch would not execute. The result is a browser bundle failure on React Native internals before any route can load.

**How to apply:** Whenever a screen or component needs `react-native-maps`, import a platform-resolved component rather than conditionally loading the library inside a cross-platform file. Keep the web component dependency-free and preserve a compatible exported interface.