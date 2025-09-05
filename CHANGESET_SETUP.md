# Changeset v3 Setup for Gemini Proxy Monorepo

This document explains how to use Changeset v3 for versioning and publishing packages in the Gemini Proxy monorepo with pnpm workspace.

## Overview

Changeset is configured to manage versioning and publishing for the following packages:

- `@gemini-proxy/core` (core business logic)
- `@lehuygiang28/gemini-proxy-appwrite` (depends on core)
- `@lehuygiang28/gemini-proxy-cloudflare` (depends on core)
- `@lehuygiang28/gemini-proxy-vercel` (depends on core)

The following packages are ignored (not published):

- `@gemini-proxy/web` (web application)
- `api` (API application)
- `@gemini-proxy/database` (database types, internal)
- `@lehuygiang28/gemini-proxy-cli` (CLI tool, separate release cycle)

## Internal Dependencies

The publishable packages depend on `@gemini-proxy/core` using the workspace protocol (`workspace:*`). This ensures that:

1. When core changes, all dependent packages are automatically updated
2. Changeset tracks internal dependencies correctly
3. Version bumps are propagated properly through the dependency chain

## Configuration

### Changeset Config (`.changeset/config.json`)

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": [
    "@changesets/changelog-github",
    {
      "repo": "giaang/giaang-github"
    }
  ],
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": [
    "@gemini-proxy/web",
    "api",
    "@gemini-proxy/database",
    "@lehuygiang28/gemini-proxy-cli"
  ]
}
```

### Package.json Scripts

```json
{
  "changeset": "changeset",
  "version": "changeset version",
  "release": "changeset publish"
}
```

### Package Dependencies (workspace protocol)

```json
{
  "dependencies": {
    "@gemini-proxy/core": "workspace:*"
  }
}
```

## Workflow

### 1. Creating a Changeset

When you make changes to any of the publishable packages, create a changeset:

```bash
pnpm changeset
```

This will:

- Show you which packages have changes
- Ask you to select which packages to include
- Ask for the type of change (patch, minor, major)
- Ask for a description of the changes
- Create a new changeset file in `.changeset/`

### 2. Versioning Packages

After creating changesets, version the packages:

```bash
pnpm version
```

This will:

- Update package.json versions based on changesets
- Update CHANGELOG.md files with GitHub links
- Remove consumed changeset files
- Update internal dependencies automatically

### 3. Publishing

To publish the packages:

```bash
pnpm release
```

This will:

- Publish packages to npm
- Create git tags

## Example Changeset

Here's an example changeset file (`.changeset/example-changeset.md`):

```markdown
---
"@gemini-proxy/core": patch
"@lehuygiang28/gemini-proxy-appwrite": patch
"@lehuygiang28/gemini-proxy-cloudflare": patch
"@lehuygiang28/gemini-proxy-vercel": patch
---

Fix authentication middleware

This update fixes a bug in the authentication middleware that was causing requests to fail.
```

## Package Configuration

Each publishable package has been configured with:

### Core Package

- `prepublishOnly`: "pnpm build" - ensures package is built before publishing
- `publishConfig.access`: "public" - publishes as public package
- `type-check`: "tsc --noEmit" - TypeScript type checking

### Appwrite Package

- `prepublishOnly`: "pnpm build" - ensures package is built before publishing
- `publishConfig.access`: "public" - publishes as public package
- `dependencies`: `"@gemini-proxy/core": "workspace:*"` - internal dependency

### Cloudflare Package  

- `prepublishOnly`: "pnpm build" - ensures package is built before publishing
- `publishConfig.access`: "public" - publishes as public package
- `dependencies`: `"@gemini-proxy/core": "workspace:*"` - internal dependency

### Vercel Package

- `prepublishOnly`: "pnpm build" - ensures package is built before publishing  
- `publishConfig.access`: "public" - publishes as public package
- `dependencies`: `"@gemini-proxy/core": "workspace:*"` - internal dependency

## Turbo Integration

The following turbo tasks have been added:

```json
{
  "changeset": {
    "cache": false
  },
  "version": {
    "cache": false
  },
  "release": {
    "dependsOn": ["build"],
    "cache": false
  },
  "type-check": {
    "dependsOn": ["^build"]
  }
}
```

## GitHub Actions CI/CD

### CI Workflow (`.github/workflows/ci.yml`)

- Runs on push and pull requests
- Installs dependencies with pnpm
- Runs linting, type checking, building, and tests
- Checks for changeset files on PRs

### Release Workflow (`.github/workflows/release.yml`)

- Runs on push to main branch
- Uses changesets/action@v1 for automated versioning and publishing
- Includes provenance and security features
- Requires NPM_TOKEN secret

## Best Practices

1. **Create changesets for every change** - Even small bug fixes should have changesets
2. **Use semantic versioning** - patch for bug fixes, minor for new features, major for breaking changes
3. **Write clear descriptions** - Help users understand what changed
4. **Test before publishing** - Always run tests and build before publishing
5. **Review changesets** - Have team members review changesets before versioning
6. **Use workspace protocol** - Always use `workspace:*` for internal dependencies

## Troubleshooting

### Changeset validation errors

If you get validation errors about package names, check that the package names in `.changeset/config.json` match exactly with the names in `package.json` files.

### Build failures during publish

Make sure all packages build successfully before running `pnpm release`. You can test this with:

```bash
pnpm build
```

### Permission errors

Make sure you're logged into npm with the correct account and have publish permissions for the `@lehuygiang28` scope.

### Internal dependency issues

Ensure all internal dependencies use the `workspace:*` protocol in package.json files.

## Commands Reference

```bash
# Create a new changeset
pnpm changeset

# Check changeset status
pnpm changeset status

# Version packages based on changesets
pnpm version

# Publish packages to npm
pnpm release

# Build all packages
pnpm build

# Run type checking
pnpm type-check

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Reference

- [Changeset Documentation](https://github.com/changesets/changesets)
- [Changeset v3 Guide](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md)
- [pnpm Workspace Protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)
- [Vercel AI Repository](https://github.com/vercel/ai) - Example of changeset usage in a similar monorepo
