---
name: EAS monorepo yarn build + OTA update
description: How to make artifacts/open-local-mobile build/update from a pnpm monorepo with EAS
---

## EAS Build (eas build)

EAS builds run with yarn. The pnpm monorepo root confuses EAS in several ways.

### Required Setup (all must be in place for builds to succeed)

1. **Vendor `@workspace/api-client-react`** into `artifacts/open-local-mobile/lib/api-client/` (copy source files)
2. **Rewrite imports** from `@workspace/api-client-react` → `@/lib/api-client` across all source files
3. **package.json**: remove `@workspace/*` dep, move `expo` + all runtime packages to `dependencies` (not devDeps — EAS reads app config before installing devDeps), set `"packageManager": "yarn@1.22.22"`, rename from `@workspace/open-local-mobile` to `open-local-mobile`
4. **tsconfig.json**: remove `references` array pointing to `../../lib/api-client-react`
5. **yarn.lock**: generate a FULL lockfile using `yarn install --cache-folder /tmp/yarn-cache --ignore-scripts` from within `artifacts/open-local-mobile/`. EAS uses `yarn install --frozen-lockfile` so a minimal 2-line stub fails immediately.
   - **CRITICAL**: Replit generates yarn.lock with internal `http://package-firewall.replit.local/npm/` URLs. EAS build servers cannot reach these. Rewrite with: `sed -i 's|http://package-firewall\.replit\.local/npm/|https://registry.npmjs.org/|g' yarn.lock`
6. **Root `.easignore`**: When `.easignore` exists at the git root, EAS replaces ALL `.gitignore` rules with it (plus only `node_modules` and `.git` as defaults). Every path from `.gitignore` that matters must be listed explicitly. Key patterns:
   - `.local`, `.cache` — pnpm content-addressable store (842MB) and cache (958MB); gitignored but not auto-excluded once `.easignore` exists
   - `pnpm-lock.yaml`, `pnpm-workspace.yaml` — prevent pnpm detection
   - `/package.json`, `/.npmrc`, `/tsconfig*.json`, `/.replit`, `/.replitignore`, `/replit.md` — root workspace files (root package.json has a preinstall hook that exits 1 for non-pnpm)
   - `/lib` — ROOT-anchored (leading slash required!). Bare `lib` excludes `artifacts/open-local-mobile/lib/` which contains the vendored API client Metro needs
   - `artifacts/api-server`, `artifacts/open-local`, `artifacts/mockup-sandbox` — non-mobile packages
   - `.config` — EAS CLI user settings, not needed on build server
7. **`.npmrc`** in mobile folder: `package-manager=yarn`
8. **`eas.json` production profile**: must have `"channel": "production"` for OTA updates to reach App Store/Play Store builds

### Pre-build local requirement

EAS CLI needs `node_modules` locally to resolve expo-router plugin (used to process app.json). Before running `eas build`, run:
```bash
cd /home/runner/workspace && pnpm install --filter @workspace/open-local-mobile
```

### Build command
```bash
cd artifacts/open-local-mobile && EXPO_TOKEN=<token> npx eas-cli build --platform all --profile production --no-wait --non-interactive
```

**Why EAS uses `--frozen-lockfile`:** EAS production builds require a complete, consistent lockfile. An empty lockfile exits in <5 seconds. A lockfile with Replit's internal registry URLs fails with network errors (iOS ~90s timeout, Android faster).

**Why `.easignore` breaks gitignore:** The `ignore` npm library, which EAS uses to copy the working directory, short-circuits `.gitignore` file loading when `.easignore` exists. The default only ignores `node_modules` and `.git`. Without explicit entries for `.local` and `.cache`, those large pnpm directories inflate the archive from ~50MB to ~399MB.

**Archive size target:** ~49-50MB (source only, no pnpm store/cache).

## EAS OTA Update (eas update)

`eas update` runs `expo export` locally then uploads bundles to EAS servers. Different issues than `eas build`.

### Required setup
1. **EAS project ID** must be in `app.json` under `extra.eas.projectId` (`01ce32a2-7226-4ae0-94e7-0fdfa18bd013`)
2. **`babel-preset-expo` at workspace root** — Metro resolves from the pnpm root `node_modules` during export. Install with `pnpm add -D -w babel-preset-expo@54.0.10`. Without it: `Cannot find module 'babel-preset-expo'` fatal error.
3. **`expo-updates` auto-installed** by EAS CLI on first run; it also writes `updates.url` into `app.json` automatically.
4. **Runtime version policy** set to `appVersion` by EAS CLI automatically.

### Command
```
cd artifacts/open-local-mobile && EXPO_TOKEN=<token> npx eas-cli update --branch production --message "..." --non-interactive
```

### Timing
Metro bundling takes ~80–90 seconds for iOS + Android. Use at least a **300 second timeout**. The command exits with code 254 at the very end due to a git tag operation blocked by Replit's sandbox — this is harmless; all bundles are already uploaded before that step.

### Branch
Use `--branch production` for App Store builds. Fingerprint is auto-computed (can be slow; set `EAS_SKIP_AUTO_FINGERPRINT=1` to skip).

**Why:** The exit-254 at the end is a Replit sandbox restriction on `git commit` — not an EAS failure. Bundles, assets, and assetmap are all confirmed uploaded before that step runs.
