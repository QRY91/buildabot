import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import { Tool, ToolContext } from "./base";

const execAsync = promisify(exec);

// Whitelist of safe commands
const ALLOWED_COMMANDS = [
  "ls",
  "pwd",
  "echo",
  "cat",
  "grep",
  "find",
  "head",
  "tail",
  "wc",
  "sort",
  "uniq",
  "cut",
  "sed",
  "awk",
  "diff",
  "tree",
  "file",
  "stat",
  "du",
  "df",
  "date",
  "whoami",
  "hostname",
  "uname",
];

// Blacklist of dangerous commands/patterns
const DANGEROUS_PATTERNS = [
  "rm",
  "rmdir",
  "del",
  "format",
  "dd",
  "mkfs",
  ":(){:|:&};:", // Fork bomb
  "curl",
  "wget",
  "nc",
  "netcat",
  "telnet",
  "ssh",
  "scp",
  "ftp",
  "chmod",
  "chown",
  "sudo",
  "su",
  ">", // Redirect (could overwrite files)
  ">>", // Append redirect
  "|", // Pipe (could chain dangerous commands)
  "&", // Background execution
  ";", // Command chaining
  "$(", // Command substitution
  "`", // Command substitution
];

/**
 * Sandboxed shell command execution tool.
 *
 * Safety features:
 * 1. Commands execute in the agent's working directory
 * 2. Whitelist of allowed commands
 * 3. Blacklist of dangerous patterns
 * 4. Timeout limit (5 seconds)
 * 5. Output buffer limit (100KB)
 * 6. Must be explicitly enabled via ENABLE_SHELL_TOOL=true
 */
export const executeCommandTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "execute_command",
      description:
        "Execute a safe shell command in the working directory. " +
        "Only basic read-only commands are allowed (ls, cat, grep, etc.). " +
        "Dangerous commands are blocked. Use with caution.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute (e.g., 'ls -la', 'cat file.txt')",
          },
        },
        required: ["command"],
      },
    },
  },
  execute: async (args, context: ToolContext) => {
    const command = args.command?.trim();

    if (!command) {
      return "Error: No command provided";
    }

    // Extract the base command (first word)
    const baseCommand = command.split(/\s+/)[0];

    // Check whitelist
    if (!ALLOWED_COMMANDS.includes(baseCommand)) {
      return `Error: Command '${baseCommand}' is not in the allowed list. Allowed commands: ${ALLOWED_COMMANDS.join(", ")}`;
    }

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (command.includes(pattern)) {
        return `Error: Command contains dangerous pattern '${pattern}' and is blocked for safety`;
      }
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: context.workingDirectory,
        timeout: 5000, // 5 second timeout
        maxBuffer: 1024 * 100, // 100KB max output
        env: {
          // Minimal environment
          PATH: process.env.PATH,
          HOME: context.workingDirectory,
        },
      });

      let result = "";
      if (stdout) {
        result += `STDOUT:\n${stdout}`;
      }
      if (stderr) {
        result += `${stdout ? "\n\n" : ""}STDERR:\n${stderr}`;
      }
      if (!stdout && !stderr) {
        result = "Command executed successfully (no output)";
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      // Check for timeout
      if (message.includes("ETIMEDOUT") || message.includes("killed")) {
        return "Error: Command timed out (5 second limit exceeded)";
      }

      return `Error executing command: ${message}`;
    }
  },
};
