import { promises as fs, Dirent } from "fs";
import { Tool } from "./base";

export const readFileTool: Tool = {
  definition: {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a file at the specified path",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to read",
          },
        },
        required: ["path"],
      },
    },
  },
  execute: async (args) => {
    try {
      const content = await fs.readFile(args.path, "utf-8");
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
      description: "Write content to a file at the specified path",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file to write",
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
  execute: async (args) => {
    try {
      await fs.writeFile(args.path, args.content, "utf-8");
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
      description: "List all files and directories in the specified path",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The directory path to list",
          },
        },
        required: ["path"],
      },
    },
  },
  execute: async (args) => {
    try {
      const entries = await fs.readdir(args.path, { withFileTypes: true });
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
