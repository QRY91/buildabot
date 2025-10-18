import { Command } from "commander";
import * as dotenv from "dotenv";
import * as readline from "readline";
import { Agent } from "./agent";
import { LLMProvider } from "./providers/base";
import { OllamaProvider } from "./providers/ollama";
import { ToolRegistry } from "./tools/base";
import {
  listDirectoryTool,
  readFileTool,
  writeFileTool,
} from "./tools/filesystem";
import { executeCommandTool } from "./tools/shell";
import { DatabaseManager } from "./db/manager";
import { AgentServer } from "./server/index";

dotenv.config();

const program = new Command();

program
  .option(
    "-p, --provider <type>",
    "LLM provider (ollama, openai, anthropic)",
    "ollama"
  )
  .option("-m, --model <name>", "Model name")
  .option(
    "-h, --host <url>",
    "Ollama host URL",
    process.env.OLLAMA_HOST || "http://localhost:11434"
  )
  .option("-k, --api-key <key>", "API key for OpenAI or Anthropic")
  .option("-s, --server", "Start web server mode")
  .option("--port <number>", "Server port", "3000")
  .option("--no-db", "Disable database logging")
  .parse();

const options = program.opts();

async function main() {
  // Initialize provider based on config
  let provider: LLMProvider;

  switch (options.provider) {
    case "ollama":
      provider = new OllamaProvider(
        options.host,
        options.model || "qwen2.5-coder:7b"
      );
      console.log(`Using Ollama at ${options.host}`);
      break;

    default:
      console.error(`Unknown provider: ${options.provider}`);
      process.exit(1);
  }

  // Initialize tool registry
  const toolRegistry = new ToolRegistry();
  toolRegistry.register(readFileTool);
  toolRegistry.register(writeFileTool);
  toolRegistry.register(listDirectoryTool);

  // Conditionally enable shell tool based on environment variable
  if (process.env.ENABLE_SHELL_TOOL === "true") {
    console.log("Shell tool enabled (SANDBOX_MODE=" + (process.env.SANDBOX_MODE === "true" ? "true" : "false") + ")");
    toolRegistry.register(executeCommandTool);
  }

  // Check if server mode
  if (options.server) {
    console.log("\nStarting server mode...\n");

    // Initialize database
    const db = new DatabaseManager("./conversations.db");
    await db.initialize();

    // Create and start server
    const server = new AgentServer({
      port: parseInt(options.port, 10),
      db,
      provider,
      toolRegistry,
      // staticPath: "./web/dist", // Uncomment when frontend is built
    });

    await server.start();

    console.log(`\nServer started successfully!`);
    console.log(`- Web UI: http://localhost:${options.port}`);
    console.log(`- API: http://localhost:${options.port}/api`);
    console.log(`- WebSocket: ws://localhost:${options.port}\n`);

    // Keep process alive
    process.on("SIGINT", async () => {
      console.log("\nShutting down server...");
      await server.stop();
      process.exit(0);
    });

    return;
  }

  // Regular CLI mode
  const db = options.db ? new DatabaseManager("./conversations.db") : undefined;
  if (db) {
    await db.initialize();
  }

  // Create agent
  const agent = new Agent(provider, toolRegistry, db ? { db } : undefined);

  // Optional: Set a system prompt
  agent.setSystemPrompt(
    "You are a helpful AI assistant with access to tools. " +
      "Use the available tools when needed to help the user. " +
      "Always be clear about what you are doing."
  );

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  console.log("\nAgent ready! Type your message or /help for commands.\n");
  rl.prompt();

  rl.on("line", async (input) => {
    const trimmed = input.trim();

    // Handle special commands
    if (trimmed === "/exit" || trimmed === "/quit") {
      console.log("Goodbye!");
      process.exit(0);
    }

    if (trimmed === "/help") {
      console.log(`
Available commands:
  /help       - Show this help message
  /exit       - Exit the program
  /clear      - Clear conversation history
  /tools      - List available tools
  /history    - Show conversation history
      `);
      rl.prompt();
      return;
    }

    if (trimmed === "/clear") {
      agent.clearHistory();
      console.log("Conversation history cleared.");
      rl.prompt();
      return;
    }

    if (trimmed === "/tools") {
      const tools = toolRegistry.getDefinitions();
      console.log("\nAvailable tools:");
      tools.forEach((tool) => {
        console.log(`  - ${tool.function.name}: ${tool.function.description}`);
      });
      console.log();
      rl.prompt();
      return;
    }

    if (trimmed === "/history") {
      const history = agent.getHistory();
      console.log("\nConversation history:");
      console.log(JSON.stringify(history, null, 2));
      console.log();
      rl.prompt();
      return;
    }

    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Process user input
    try {
      console.log(); // Empty line for readability
      const response = await agent.run(trimmed);
      console.log(response);
      console.log(); // Empty line for readability
    } catch (error) {
      console.error("Error:", error instanceof Error ? error.message : String(error));
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log("\nGoodbye!");
    process.exit(0);
  });
}

main().catch(console.error);
