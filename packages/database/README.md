# Gemini Proxy - Database

This package contains the database schema and management scripts for the Gemini Proxy application. It's designed to be used with Supabase, a backend-as-a-service platform that provides a PostgreSQL database, authentication, and more.

## Table of Contents

- [Schema](#schema)
  - [Tables](#tables)
  - [Indexes](#indexes)
  - [Triggers](#triggers)
  - [Row-Level Security (RLS)](#row-level-security-rls)
- [Scripts](#scripts)
  - [Generating Types](#generating-types)
  - [Pushing Schema Changes](#pushing-schema-changes)
- [Usage](#usage)

## Schema

The database schema is defined in the `sql/schema.sql` file.

### Tables

- **`api_keys`:** Stores the user's Google Gemini API keys.
- **`proxy_api_keys`:** Stores the proxy API keys that are used to authenticate with the Gemini Proxy.
- **`request_logs`:** Stores detailed logs of all requests made through the proxy.

### Indexes

Indexes are created on frequently queried columns to improve database performance.

### Triggers

A trigger is used to automatically update the `updated_at` timestamp on the `api_keys` and `proxy_api_keys` tables whenever a row is updated.

### Row-Level Security (RLS)

RLS policies are in place to ensure that users can only access their own data.

## Scripts

### Generating Types

To generate TypeScript types from your Supabase schema, run the following command:

```bash
pnpm gen:types
```

This will create a `types/database.types.ts` file with the generated types.

### Pushing Schema Changes

To apply the schema defined in `sql/schema.sql` to your Supabase database, run:

```bash
pnpm db:push
```

**Note:** This command will overwrite the existing schema in your database. Make sure to back up your data before running it.

## Usage

This is an internal package and is not meant to be used directly. The generated types are used by the `@gemini-proxy/core` package to provide type safety when interacting with the database.
