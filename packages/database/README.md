# Gemini Proxy - Database

[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

This internal package contains the database schema, types, and management scripts for the **Gemini Proxy** application.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Overview</strong></summary>

- [Schema](#️-schema)
- [Scripts](#️-scripts)

</details>

<details>
<summary><strong>💻 Usage</strong></summary>

- [Installation](#-installation)
- [Usage Information](#-usage-information)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Back to Main README](#-back-to-main-readme)

</details>

## 🏗️ Schema

The database schema is defined in `sql/schema.sql` and includes tables for `api_keys`, `proxy_api_keys`, and `request_logs`.

## 🛠️ Scripts

### **Generating Types**

```bash
pnpm gen:types
```

### **Pushing Schema Changes**

```bash
pnpm db:push
```

**Warning:** This command will overwrite the existing schema in your database.

## 📦 Installation

This is an internal package and is not intended for direct installation.

## 💻 Usage Information

The generated TypeScript types are used by the `@gemini-proxy/core` package.

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
