import { Router, Request, Response } from "express";
import { DatabaseManager } from "../db/manager";
import { Agent } from "../agent";
import { ToolRegistry } from "../tools/base";
import { LLMProvider } from "../providers/base";
import { EventEmitter } from "events";

export function createAPIRouter(
  db: DatabaseManager,
  provider: LLMProvider,
  toolRegistry: ToolRegistry,
  eventEmitter: EventEmitter
): Router {
  const router = Router();

  router.get("/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await db.listConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  router.post("/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      if (!title) {
        return res.status(400).json({ error: "Title is required" });
      }

      const conversation = await db.createConversation(title);
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  router.get("/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }

      const conversation = await db.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      const messages = await db.getMessages(id);

      res.json({
        ...conversation,
        messages,
      });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  router.delete("/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }

      await db.deleteConversation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  router.post("/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Conversation ID is required" });
      }

      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ error: "Message content is required" });
      }

      const conversation = await db.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Auto-update title if it's still "New Chat"
      if (conversation.title === "New Chat") {
        const newTitle = content.length > 50 ? content.substring(0, 50) + "..." : content;
        await db.updateConversationTitle(id, newTitle);
      }

      const agent = new Agent(provider, toolRegistry, {
        db,
        eventEmitter,
      });
      agent.setConversationId(id);

      const response = await agent.run(content);

      res.json({ response });
    } catch (error) {
      console.error("Error processing message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  return router;
}
