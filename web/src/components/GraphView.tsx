import { useMemo } from 'react';
import ReactFlow, { Node, Edge, Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';
import { Conversation, Message, ToolCall } from '../types';

interface GraphViewProps {
  conversation: Conversation | null;
}

export function GraphView({ conversation }: GraphViewProps) {
  const { nodes, edges } = useMemo(() => {
    if (!conversation || !conversation.messages) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let yPosition = 0;
    const spacing = 150;

    conversation.messages.forEach((message, idx) => {
      const nodeId = message.id;

      // Parse tool calls if present
      let toolCalls: ToolCall[] = [];
      if (message.tool_calls) {
        try {
          toolCalls = JSON.parse(message.tool_calls);
        } catch (e) {
          // Ignore
        }
      }

      // Parse metadata
      let metadata: any = {};
      if (message.metadata) {
        try {
          metadata = JSON.parse(message.metadata);
        } catch (e) {
          // Ignore
        }
      }

      // Determine node type and color
      let nodeType = 'default';
      let nodeColor = '#333';
      let nodeLabel = '';

      if (message.role === 'user') {
        nodeColor = '#10b981'; // green
        nodeLabel = `User Input\n${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`;
      } else if (message.role === 'assistant') {
        if (toolCalls.length > 0) {
          nodeColor = '#f59e0b'; // orange
          nodeLabel = `Tool Call\n${toolCalls.map(tc => tc.function.name).join(', ')}`;
        } else {
          nodeColor = '#06b6d4'; // cyan
          nodeLabel = `Assistant\n${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`;
        }
      } else if (message.role === 'tool') {
        nodeColor = '#8b5cf6'; // purple
        nodeLabel = `Tool Result\n${metadata.tool_name || 'Tool'}\n${message.duration_ms ? `(${message.duration_ms}ms)` : ''}`;
      }

      nodes.push({
        id: nodeId,
        type: nodeType,
        data: {
          label: nodeLabel,
        },
        position: { x: 250, y: yPosition },
        style: {
          background: nodeColor,
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '200px',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
        },
      });

      // Connect to previous node
      if (idx > 0) {
        edges.push({
          id: `${conversation.messages[idx - 1].id}-${nodeId}`,
          source: conversation.messages[idx - 1].id,
          target: nodeId,
          animated: true,
          style: { stroke: '#666' },
        });
      }

      yPosition += spacing;
    });

    return { nodes, edges };
  }, [conversation]);

  if (!conversation) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
        fontSize: '18px',
        backgroundColor: '#0f0f0f',
      }}>
        Select a conversation to view the graph
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: '100vh', backgroundColor: '#0f0f0f' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#333" gap={16} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
