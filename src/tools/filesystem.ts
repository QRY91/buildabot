import { promises as fs, Dirent } from "fs";
import { Tool, ToolContext } from "./base";
import { resolvePathInWorkingDir } from "./path-utils";

export const readFileTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file at the specified path. Path is relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to read (relative to working directory)",
          },
        },
        required: ["path"],
      },
    },
  },
  execute: async (args, context: ToolContext) => {
    try {
      const resolvedPath = resolvePathInWorkingDir(args.path, context.workingDirectory);
      const content = await fs.readFile(resolvedPath, "utf-8");
      return content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error reading file: ${message}`;
    }
  },
};

export const writeFileTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file at the specified path. Path is relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to write (relative to working directory)",
          },
          content: {
            type: "string",
            description: "The content to write to the file",
          },
        },
        required: ["path", "content"],
      },
    },
  },
  execute: async (args, context: ToolContext) => {
    try {
      const resolvedPath = resolvePathInWorkingDir(args.path, context.workingDirectory);
      await fs.writeFile(resolvedPath, args.content, "utf-8");
      return `Successfully wrote to ${args.path}`;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error writing file: ${message}`;
    }
  },
};

export const listDirectoryTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "list_directory",
      description: "List all files and directories in the specified path. Path is relative to the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The directory path to list (relative to working directory, use '.' for current directory)",
          },
        },
        required: ["path"],
      },
    },
  },
  execute: async (args, context: ToolContext) => {
    try {
      const resolvedPath = resolvePathInWorkingDir(args.path, context.workingDirectory);
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const formatted = entries
        .map((entry: Dirent) => {
          const type = entry.isDirectory() ? "[DIR]" : "[FILE]";
          return `${type} ${entry.name}`;
        })
        .join("\n");
      return formatted;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return `Error listing directory: ${message}`;
    }
  },
};
