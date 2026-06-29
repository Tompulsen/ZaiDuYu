---
name: comfyui-scan
description: Scan a ComfyUI plugin codebase to inventory node definitions, API endpoints, brand references, and common patterns — use when asked to "scan the document", "scan the nodes", or audit a ComfyUI custom node package
---

# ComfyUI Codebase Scanner

## Overview

Systematically scan a ComfyUI custom node package to produce a structured inventory of all nodes, API endpoints, brand references, and configuration patterns. Use when the user says "扫描整个文档", "扫描所有节点", "scan the codebase", or wants to audit/understand a ComfyUI plugin.

**Core principle:** Be exhaustive. Missed targets cause downstream bugs (hardcoded URLs that weren't found, brand references that weren't updated).

## When to Use

- User says "扫描整个文档" / "扫描所有节点" / "scan the entire document"
- Before rebranding (need to know all locations to change)
- Before debugging API connectivity (need to know all endpoints)
- When onboarding to an unfamiliar ComfyUI plugin project
- After receiving a plugin package and before making modifications

## The Process

### Step 1: Discover Project Structure

```
1. List top-level files and directories
2. Identify key files:
   - __init__.py (node registration, imports)
   - Comfly.py or similar main node file(s)
   - fal_batch_nodes.py (FAL platform nodes, if present)
   - utils.py (shared utilities)
   - requirements.txt / pyproject.toml (dependencies)
   - web/js/*.js or web/extensions/*.js (frontend extensions)
   - AiHelper.py (local aiohttp server, if present)
   - Comflyapi.json (API key config, if present)
   - workflow/*.json (example workflows)
3. Count total lines per key file
```

### Step 2: Scan Node Definitions

Search all `.py` files for node class definitions:

```
Patterns to find:
- class Comfly_* / class Comfy_* (node classes)
- NODE_CLASS_MAPPINGS dictionary (registration)
- NODE_DISPLAY_NAME_MAPPINGS dictionary (display names)
- INPUT_TYPES class method (node parameters)
- RETURN_TYPES class method (output types)
- CATEGORY class attribute (ComfyUI category path)
- FUNCTION class attribute (method name)
- OUTPUT_NODE class attribute (if True, node produces UI output)
```

For each node found, record:
- Class name
- Display name (from NODE_DISPLAY_NAME_MAPPINGS)
- Category path
- INPUT_TYPES parameters (name, type, default, optional)
- RETURN_TYPES
- Key methods (generate, process, etc.)

### Step 3: Scan API Endpoints

Search for all HTTP/URL references:

```
Patterns to find:
- Hardcoded URLs: "https://..." or "http://..." in Python files
- baseurl / base_url / api_url / api_base variables
- requests.get / requests.post / session.get / session.post calls
- Endpoint paths: /v1/chat/completions, /v1/images/edits, /v1/images/generations
- API key references: api_key, API_KEY, Authorization headers
- Timeout/retry constants: DEFAULT_NODE_TIMEOUT, DEFAULT_RETRY_TIMES
```

For each endpoint, record:
- URL (full or base)
- HTTP method (GET/POST)
- Purpose (text2img, img2img, status poll, etc.)
- Whether it's hardcoded or configurable via UI

### Step 4: Scan Brand References

Search for brand/name references across all files:

```
Patterns to find:
- Project name in pyproject.toml (name, displayName, description)
- Brand strings in Python files (category prefixes, display names)
- URL domains in code and README
- cnr_id in workflow JSONs (ComfyUI registry ID)
- GitHub repository references
- publisherId in pyproject.toml
```

### Step 5: Scan Networking Patterns

Identify the HTTP communication architecture:

```
Check for:
- Synchronous: direct requests.get/post with retry
- Async polling: submit POST → poll status_url until done
- Session-based: requests.Session with retry adapter
- Proxy handling: proxy fallback, system proxy bypass
- SSL handling: verify=True/False, warning suppression
- Timeout architecture: connect timeout vs read timeout
```

### Step 6: Scan Frontend Extensions

Check `web/js/` or `web/extensions/` for JavaScript:

```
- DOMWidget registrations (node.addDOMWidget)
- Event listeners (PromptServer.instance.send_sync)
- API fetch calls (hardcoded localhost URLs)
- Progress bar implementations
- Custom UI elements
```

### Step 7: Generate Report

Output a structured summary:

```markdown
## ComfyUI Plugin Scan Report

### Project: [name]
### Path: [directory]

### Node Inventory
| # | Class Name | Display Name | Category | Inputs | Outputs |
|---|-----------|-------------|----------|--------|---------|

### API Endpoints
| # | URL | Method | Purpose | Configurable |
|---|-----|--------|---------|-------------|

### Brand References
| # | File | Location | Current Value | Type |
|---|------|----------|--------------|------|

### Networking Pattern
- Type: [sync/async polling/session]
- Proxy: [none/fallback/fixed]
- Timeout: [seconds]

### Frontend Extensions
| # | File | Purpose |
|---|------|---------|
```

## Common Pitfalls

1. **Don't skip workflow JSONs** — they contain cnr_id, aux_id, and example URLs that may need updating
2. **Don't assume only Python files matter** — JS extensions, README, pyproject.toml all contain relevant references
3. **Check both `baseurl` variable AND hardcoded URLs** — some code uses the variable, some has URLs inline
4. **Look for `__init__.py` imports** — tells you which files are actually loaded (vs dead code)
5. **PowerShell struggles with Chinese filenames** — use Python `glob` + `open()` with UTF-8 encoding for bulk operations

## Integration

This skill is typically followed by:
- **Editing** based on scan results (rebranding, URL changes, bug fixes)
- **compose:debug** if scan reveals issues
- **compose:verify** after making changes

## Example Usage

User: "扫描整个文档，查看节点的接口地址"
→ Run Steps 1-6, focusing on Step 3 (API endpoints)
→ Report all found URLs with file locations and line numbers

User: "扫描所有节点，看哪些需要改名"
→ Run Steps 1-2, focusing on Step 4 (brand references)
→ Report all NODE_DISPLAY_NAME_MAPPINGS and category paths
