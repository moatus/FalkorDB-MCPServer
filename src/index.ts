import { falkorDBService } from './services/falkordb.service.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { redisService } from './services/redis.service.js';

// Create an MCP server
const server = new McpServer({
  name: "falkordb-mcpserver",
  version: "1.0.0"
});

server.registerResource(
  "graph_list",
  "graph://listing",
  {
    title: "List Graphs",
    description: "List all graphs in the database",
    mimeType: "text/plain",
  },
  async (uri) => {
    const graphNames = await falkorDBService.listGraphs();
    const allResults = [];
    for (const graphName of graphNames) {
      const result = await falkorDBService.executeQuery(graphName, "MATCH (n)-[r]->(m) RETURN n, r, m");
      allResults.push({
        graphName,
        result: result,
      });
    }

    const resultString = allResults.map((result) => {
      return `Graph: ${result.graphName}\nAll Nodes:\n${JSON.stringify(result.result, null, 2)}`;
    }).join("\n");

    return {
      contents: [{
        uri: uri.href,
        text: resultString,
      }]
    }
  }
)

server.registerTool(
  "query_graph",
  {
    title: "Query Graph",
    description: "Run a OpenCypher query on a graph",
    inputSchema: {
      graphName: z.string().describe("The name of the graph to query"),
      query: z.string().describe("The OpenCypher query to run"),
    },
  },
  async ({graphName, query}) => {
    const result = await falkorDBService.executeQuery(graphName, query);
    return {
      content: [{
        type: "text",
        text: JSON.stringify(result, null, 2)
      }]
    };
  }
);

server.registerTool(
  "list_graphs",
  {
    title: "List Graphs",
    description: "List all graphs in the database",
    inputSchema: {},
  },
  async () => {
    const result = await falkorDBService.listGraphs();
    return {
      content: [{
        type: "text",
        text: result.join("\n"),
      }]
    };
  }
);

server.registerTool(
  "delete_graph",
  {
    title: "Delete Graph",
    description: "Delete a graph from the database",
    inputSchema: {
      graphName: z.string().describe("The name of the graph to delete"),
    },
  },
  async ({graphName}) => {
    await falkorDBService.deleteGraph(graphName);
    return {
      content: [{
        type: "text",
        text: `Graph ${graphName} deleted`
      }]
    };
  }
);

server.registerTool(
  "set_key",
  {
    title: "Set Key",
    description: "Set a key in FalkorDB",
    inputSchema: {
      key: z.string().describe("The key to set"),
      value: z.string().describe("The value to set"),
    },
  },
  async ({key, value}) => {
    await redisService.set(key, value);
    return {
      content: [{
        type: "text",
        text: `Key ${key} set to ${value}`
      }]
    };
  }
);

server.registerTool(
  "get_key",
  {
    title: "Get Key",
    description: "Get a key from FalkorDB",
    inputSchema: {
      key: z.string().describe("The key to get"),
    },
  },
  async ({key}) => {
    const value = await redisService.get(key);
    return {
      content: [{
        type: "text",
        text: `Key ${key} is ${value}`
      }]
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
falkorDBService.close();
redisService.close();