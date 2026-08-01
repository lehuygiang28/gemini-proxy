# Gemini Proxy - CLI

[![NPM Version](https://img.shields.io/npm/v/@lehuygiang28/gemini-proxy-cli?style=flat-square)](https://www.npmjs.com/package/@lehuygiang28/gemini-proxy-cli)
[![License](https://img.shields.io/github/license/lehuygiang28/gemini-proxy?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/lehuygiang28/gemini-proxy/pulls)

The **Gemini Proxy CLI** is a powerful command-line tool for managing your Gemini Proxy instance.

## 📋 Table of Contents

<details>
<summary><strong>🚀 Getting Started</strong></summary>

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)

</details>

<details>
<summary><strong>⚙️ Configuration</strong></summary>

- [Configuration Setup](#️-configuration-setup)
- [Environment Variables](#-environment-variables)

</details>

<details>
<summary><strong>💻 Command Reference</strong></summary>

- [Configuration Commands](#configuration-commands)
- [API Key Commands](#api-key-commands)
- [Proxy Key Commands](#proxy-key-commands)
- [Log Commands](#log-commands)

</details>

<details>
<summary><strong>📚 References</strong></summary>

- [Back to Main README](#-back-to-main-readme)

</details>

## ✨ Features

- ✅ **Interactive & User-Friendly:** Easy-to-use interactive prompts.
- ✅ **Secure:** Input validation and sanitization for all commands.
- ✅ **Production Ready:** Comprehensive error handling, validation, and logging.
- ✅ **Batch Operations:** High-performance batch operations for efficient management.
- ✅ **Extensible:** A modular structure that is easy to extend.

## 📦 Installation

```bash
pnpm install -g @lehuygiang28/gemini-proxy-cli
```

## 🚀 Quick Start

### **1. Configure the CLI**

```bash
gproxy config setup
```

### **2. Test Your Connection**

```bash
gproxy config test
```

### **3. Create an API Key**

```bash
gproxy api-keys create --quick
```

### **4. Create a Proxy Key**

```bash
gproxy proxy-keys create --quick
```

## ⚙️ Configuration Setup

- **Interactive Setup (Recommended):** `gproxy config setup`
- **Environment Variables:** Create a `.env` file in your project directory.
- **Manual Configuration:** `gproxy config update`

## 🌳 Environment Variables

### **Required Variables**

| Variable                    | Description                     |
| --------------------------- | ------------------------------- |
| `SUPABASE_URL`              | Your Supabase project URL.      |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key. |

## 💻 Command Reference

### **Configuration Commands**

- `gproxy config setup`
- `gproxy config show`
- `gproxy config update`
- `gproxy config test`
- `gproxy config clear`

### **API Key Commands**

- `gproxy api-keys list`
- `gproxy api-keys create`
- `gproxy api-keys edit`
- `gproxy api-keys delete <id>`
- `gproxy api-keys sync`

### **Proxy Key Commands**

- `gproxy proxy-keys list`
- `gproxy proxy-keys create`
- `gproxy proxy-keys edit`
- `gproxy proxy-keys delete <id>`
- `gproxy proxy-keys sync`

### **Log Commands**

- `gproxy logs list`
- `gproxy logs prune`
- `gproxy logs get <id>`
- `gproxy logs stats`

## 📚 Back to Main README

For a complete overview of the project, please refer to the [**root README.md**](../../README.md).

---

**Made with ❤️ by [lehuygiang28](https://github.com/lehuygiang28)**
