# Shell Tool Safety Documentation

## Overview

The `execute_command` tool is a sandboxed shell execution tool designed for safe learning and testing. It implements multiple layers of security to prevent accidental system damage.

## Safety Features

### 1. Feature Flag (Must Enable Explicitly)
```bash
# In .env file:
ENABLE_SHELL_TOOL=false  # Default - tool is disabled

# To enable:
ENABLE_SHELL_TOOL=true
```

### 2. Sandbox Directory Restriction
- All commands execute with `cwd` set to `/sandbox/` directory
- Cannot access files outside sandbox (unless absolute paths are used - be careful!)
- `HOME` environment variable is set to sandbox directory

### 3. Command Whitelist
Only these commands are allowed:
```
ls, pwd, echo, cat, grep, find, head, tail, wc, sort, uniq, cut,
sed, awk, diff, tree, file, stat, du, df, date, whoami, hostname, uname
```

### 4. Dangerous Pattern Blacklist
These patterns are blocked:
```
rm, rmdir, del, format, dd, mkfs, curl, wget, nc, ssh, sudo, su,
>, >>, |, &, ;, $(, `
```

### 5. Execution Limits
- **Timeout**: 5 seconds maximum
- **Output Buffer**: 100KB maximum
- **Working Directory**: Locked to sandbox

## Usage in CLI

When registering tools in your CLI/agent:

```typescript
import * as dotenv from 'dotenv';
import { executeCommandTool } from './tools/shell';

dotenv.config();

// Only register if explicitly enabled
if (process.env.ENABLE_SHELL_TOOL === 'true') {
  toolRegistry.register(executeCommandTool);
  console.log('⚠️  Shell tool enabled (sandbox mode)');
} else {
  console.log('Shell tool disabled (set ENABLE_SHELL_TOOL=true to enable)');
}
```

## Testing

1. **Enable the tool**:
   ```bash
   echo "ENABLE_SHELL_TOOL=true" >> .env
   ```

2. **Test with safe commands**:
   - See `sandbox/test-commands.md` for examples
   - Try: `ls`, `cat test-data/file1.txt`, `grep "test" test-data/*.txt`

3. **Verify blocking works**:
   - Try: `rm test-data/file1.txt` (should be blocked)
   - Try: `curl https://example.com` (should be blocked)

## Security Considerations

### Current Limitations
- Absolute paths can still escape sandbox (e.g., `/etc/passwd`)
- Symbolic links could potentially bypass restrictions
- Command injection via arguments is partially mitigated but not perfect

### Recommendations for Production
If you ever want to use this in production (not recommended for learning projects):

1. **Use Docker containers** with read-only filesystem
2. **Use `chroot` jail** to prevent filesystem escape
3. **Use `seccomp` filters** to restrict system calls
4. **Implement strict argument validation**
5. **Use dedicated sandboxing libraries** (like `isolated-vm`)
6. **Add audit logging** for all commands executed

### For This Learning Project
The current implementation is **sufficient for learning** because:
- You control the inputs (testing manually)
- Sandbox directory has no critical data
- Whitelist prevents most dangerous operations
- You're aware of the limitations

## Adding New Allowed Commands

Edit `src/tools/shell.ts`:

```typescript
const ALLOWED_COMMANDS = [
  // ... existing commands ...
  "newcommand",  // Add your new command here
];
```

**Before adding a command, verify it's safe:**
- ✅ Read-only operations (cat, grep, ls)
- ✅ Information gathering (pwd, whoami, date)
- ❌ Write operations (touch, mkdir, cp, mv)
- ❌ Network operations (curl, wget, ssh)
- ❌ System modifications (chmod, chown, sudo)

## Disabling the Tool

To disable the shell tool:
```bash
# In .env:
ENABLE_SHELL_TOOL=false

# Or remove the line entirely (defaults to false)
```

## Alternative: Testing Without Shell Tool

You can test most agent functionality using only the filesystem tools:
- `read_file` - Read files safely
- `write_file` - Write files (be careful!)
- `list_directory` - List directory contents

These are safer alternatives to shell commands for most use cases.
