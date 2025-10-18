import { WebSocket, WebSocketServer } from "ws";
import { IncomingMessage } from "http";
import { DatabaseManager } from "../db/manager";
import { Agent } from "../agent";
import { ToolRegistry } from "../tools/base";
import { LLMProvider } from "../providers/base";
import { EventEmitter } from "events";

export function setupWebSocket(
  wss: WebSocketServer,
  db: DatabaseManager,
  provider: LLMProvider,
  toolRegistry: ToolRegistry
): void {
  wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
    console.log("New WebSocket connection");

    const eventEmitter = new EventEmitter();

    eventEmitter.on("agent_event", (event) => {
      ws.send(JSON.stringify({
        type: "agent_event",
        ...event,
      }));
    });

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === "chat") {
          const { conversationId, content } = message;

          if (!conversationId || !content) {
            ws.send(JSON.stringify({
              type: "error",
              error: "conversationId and content are required",
            }));
            return;
          }

          const conversation = await db.getConversation(conversationId);
          if (!conversation) {
            ws.send(JSON.stringify({
              type: "error",
              error: "Conversation not found",
            }));
            return;
          }

          const agent = new Agent(provider, toolRegistry, {
            db,
            eventEmitter,
          });
          agent.setConversationId(conversationId);

          try {
            const stream = agent.runStream(content);

            for await (const chunk of stream) {
              ws.send(JSON.stringify({
                type: "stream_chunk",
                conversationId,
                chunk,
              }));
            }

            ws.send(JSON.stringify({
              type: "stream_complete",
              conversationId,
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: "error",
              conversationId,
              error: error instanceof Error ? error.message : String(error),
            }));
          }
        } else if (message.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (error) {
        console.error("WebSocket error:", error);
        ws.send(JSON.stringify({
          type: "error",
          error: "Invalid message format",
        }));
      }
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
      eventEmitter.removeAllListeners();
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });
}
