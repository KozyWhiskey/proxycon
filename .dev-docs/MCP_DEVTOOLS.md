# Next.js 16 DevTools MCP Guide

**Last Updated:** December 19, 2025
**Next.js Version:** 16.0.10+
**Status:** Active

---

## Overview

This project utilizes **Next.js 16**, which includes a built-in **Model Context Protocol (MCP)** server. This server exposes the internal state of the running application to AI agents (like Gemini, Cursor, Windsurf), allowing them to diagnose errors, inspect routes, and understand page metadata in real-time.

**Why this matters:**
Instead of guessing why a page is broken or grepping for routes, AI agents can query the *running* dev server to get the exact state of the application.

---

## 1. Setup & Configuration

To ensure all AI agents can discover the local Next.js DevTools, we must have a `.mcp.json` file at the project root.

### Required Configuration (`.mcp.json`)
```json
{
  "mcpServers": {
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

### Verification
1.  Run the dev server: `npm run dev`.
2.  The MCP server is automatically available at `/_next/mcp` (internal).
3.  Agents using `next-devtools-mcp` will auto-discover the server (usually on port 3000).

---

## 2. Best Practices for AI Interaction

When working with an AI agent on this project, follow these workflows to leverage the MCP server effectively.

### A. Diagnosing Errors (The "First Step")
**Before** asking the AI to fix a bug, instruct it to check the runtime errors.
*   **Tool:** `get_errors`
*   **Prompt:** "Check the running app for errors."
*   **Why:** Captures hydration errors, server-side exceptions, and build failures that static analysis might miss.

### B. Understanding Project Structure
**Before** implementing a new feature, use the router to understand existing paths.
*   **Tool:** `get_routes`
*   **Why:** Provides a definitive list of App Router (`/app`) and Pages Router (`/pages`) paths, including dynamic segments like `[id]`.

### C. Inspecting Specific Pages
When working on a specific route (e.g., `/tournament/[id]`), getting context is crucial.
*   **Tool:** `get_page_metadata`
*   **Why:** Returns the active components, props (where applicable), and render status for the current page.

### D. Server Actions
To trace where a server action is defined or used.
*   **Tool:** `get_server_action_by_id`
*   **Why:** Helps map the flow of data mutations without manually hunting through files.

---

## 3. Available Tools Reference

| Tool Name | Description | Use Case |
|-----------|-------------|----------|
| `get_project_metadata` | Returns project path, version, and server URL. | Initial context gathering. |
| `get_errors` | **CRITICAL.** Returns active build/runtime errors. | Debugging "Broken" pages. |
| `get_routes` | Lists all accessible URL routes. | Feature planning, navigation checks. |
| `get_page_metadata` | Details about the currently rendered page. | Context for page-specific edits. |
| `get_logs` | Path to server logs. | Deep debugging of server-side logic. |
| `get_server_action_by_id`| Locates server action definitions. | Debugging form submissions/mutations. |

---

## 4. Troubleshooting

**"Server not found"**
*   Ensure `npm run dev` is running.
*   Check if the port is 3000 (default). If running on 3001+, the agent may need manual port configuration (though `next-devtools-mcp` handles discovery).

**"Tool execution failed"**
*   Ensure the dev server isn't stuck in a "compiling" loop.
*   Restart the dev server.
