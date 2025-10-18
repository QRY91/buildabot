import { Database } from "sqlite";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { readFileSync } from "fs";
import { join } from "path";
import { v4 as uuid } from "uuid";

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tool_calls?: string | undefined;
  metadata?: string | undefined;
  timestamp: number;
  duration_ms?: number | undefined;
  token_count?: number | undefined;
}

export interface MessageMetadata {
  model?: string | undefined;
  temperature?: number | undefined;
  finish_reason?: string | undefined;
  tool_name?: string | undefined;
  tool_arguments?: string | undefined;
  error?: string | undefined;
  [key: string]: any;
}

export class DatabaseManager {
  private db: Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = "./conversations.db") {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database,
    });

    const schemaPath = join(__dirname, "schema.sql");
    const schema = readFileSync(schemaPath, "utf-8");
    await this.db.exec(schema);
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  async createConversation(title: string): Promise<Conversation> {
    if (!this.db) throw new Error("Database not initialized");

    const id = uuid();
    const now = Date.now();

    await this.db.run(
      "INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)",
      [id, title, now, now]
    );

    return { id, title, created_at: now, updated_at: now };
  }

  async getConversation(id: string): Promise<Conversation | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.get(
      "SELECT * FROM conversations WHERE id = ?",
      [id]
    );

    return row || null;
  }

  async listConversations(): Promise<Conversation[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.all(
      "SELECT * FROM conversations ORDER BY updated_at DESC"
    );

    return rows;
  }

  async updateConversationTimestamp(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(
      "UPDATE conversations SET updated_at = ? WHERE id = ?",
      [Date.now(), id]
    );
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run(
      "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
      [title, Date.now(), id]
    );
  }

  async deleteConversation(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run("DELETE FROM conversations WHERE id = ?", [id]);
  }

  async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "tool" | "system",
    content: string,
    options?: {
      toolCalls?: any[] | undefined;
      metadata?: MessageMetadata | undefined;
      durationMs?: number | undefined;
      tokenCount?: number | undefined;
    }
  ): Promise<Message> {
    if (!this.db) throw new Error("Database not initialized");

    const id = uuid();
    const timestamp = Date.now();

    const message: Message = {
      id,
      conversation_id: conversationId,
      role,
      content,
      timestamp,
      tool_calls: options?.toolCalls ? JSON.stringify(options.toolCalls) : undefined,
      metadata: options?.metadata ? JSON.stringify(options.metadata) : undefined,
      duration_ms: options?.durationMs,
      token_count: options?.tokenCount,
    };

    await this.db.run(
      `INSERT INTO messages
       (id, conversation_id, role, content, tool_calls, metadata, timestamp, duration_ms, token_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        message.id,
        message.conversation_id,
        message.role,
        message.content,
        message.tool_calls || null,
        message.metadata || null,
        message.timestamp,
        message.duration_ms || null,
        message.token_count || null,
      ]
    );

    await this.updateConversationTimestamp(conversationId);

    return message;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    if (!this.db) throw new Error("Database not initialized");

    const rows = await this.db.all(
      "SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC",
      [conversationId]
    );

    return rows;
  }

  async getMessage(id: string): Promise<Message | null> {
    if (!this.db) throw new Error("Database not initialized");

    const row = await this.db.get("SELECT * FROM messages WHERE id = ?", [id]);

    return row || null;
  }

  async deleteMessage(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.run("DELETE FROM messages WHERE id = ?", [id]);
  }

  generateTitle(firstUserMessage: string, maxLength: number = 50): string {
    const cleaned = firstUserMessage.trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    return cleaned.substring(0, maxLength - 3) + "...";
  }
}
