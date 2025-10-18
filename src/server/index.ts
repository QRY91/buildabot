import express, { Express } from "express";
import cors from "cors";
import { createServer, Server } from "http";
import { WebSocketServer } from "ws";
import { DatabaseManager } from "../db/manager";
import { LLMProvider } from "../providers/base";
import { ToolRegistry } from "../tools/base";
import { createAPIRouter } from "./api";
import { setupWebSocket } from "./websocket";
import { EventEmitter } from "events";
import * as path from "path";

export interface ServerConfig {
  port: number;
  db: DatabaseManager;
  provider: LLMProvider;
  toolRegistry: ToolRegistry;
  staticPath?: string | undefined;
}

export class AgentServer {
  private app: Express;
  private server: Server;
  private wss: WebSocketServer;
  private db: DatabaseManager;
  private provider: LLMProvider;
  private toolRegistry: ToolRegistry;
  private port: number;
  private eventEmitter: EventEmitter;

  constructor(config: ServerConfig) {
    this.port = config.port;
    this.db = config.db;
    this.provider = config.provider;
    this.toolRegistry = config.toolRegistry;
    this.eventEmitter = new EventEmitter();

    this.app = express();
    this.app.use(cors());
    this.app.use(express.json());

    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupRoutes(config.staticPath);
    setupWebSocket(this.wss, this.db, this.provider, this.toolRegistry);
  }

  private setupRoutes(staticPath?: string): void {
    const apiRouter = createAPIRouter(
      this.db,
      this.provider,
      this.toolRegistry,
      this.eventEmitter
    );
    this.app.use("/api", apiRouter);

    this.app.get("/health", (req, res) => {
      res.json({ status: "ok" });
    });

    if (staticPath) {
      this.app.use(express.static(staticPath));

      this.app.get("*", (req, res) => {
        res.sendFile(path.join(staticPath, "index.html"));
      });
    }
  }

  async start(): Promise<void> {
    await this.db.initialize();

    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(`Server running on http://localhost:${this.port}`);
        console.log(`WebSocket available at ws://localhost:${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          console.error("Error closing WebSocket server:", err);
        }
      });

      this.server.close(async (err) => {
        if (err) {
          reject(err);
        } else {
          await this.db.close();
          resolve();
        }
      });
    });
  }

  getApp(): Express {
    return this.app;
  }
}
