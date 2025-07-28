import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { falkorDBService } from '../services/falkordb.service.js';
import { redisService } from '../services/redis.service.js';
import { logger } from '../services/logger.service.js';
import { AppError, CommonErrors } from '../errors/AppError.js';

function registerQueryGraphTool(server: McpServer): void {
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
      try {
        if (!graphName?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Graph name is required and cannot be empty',
            true
          );
        }
        
        if (!query?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Query is required and cannot be empty',
            true
          );
        }
        
        const result = await falkorDBService.executeQuery(graphName, query);
        await logger.debug('Query tool executed successfully', { graphName });
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error) {
        await logger.error('Query tool execution failed', error instanceof Error ? error : new Error(String(error)), { graphName, query });
        throw error;
      }
    }
  )
}

function registerListGraphsTool(server: McpServer): void {
  // Register list_graphs tool
  server.registerTool(
    "list_graphs",
    {
      title: "List Graphs",
      description: "List all graphs available to query",
      inputSchema: {},
    },
    async () => {
      try {
        const result = await falkorDBService.listGraphs();
        await logger.debug('List graphs tool executed', { count: result.length });
        
        return {
          content: [{
            type: "text",
            text: result.join("\n"),
          }]
        };
      } catch (error) {
        await logger.error('List graphs tool execution failed', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  );
}

function registerDeleteGraphTool(server: McpServer): void {
  // Register delete_graph tool
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
      try {
        if (!graphName?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Graph name is required and cannot be empty',
            true
          );
        }
        
        await falkorDBService.deleteGraph(graphName);
        await logger.info('Delete graph tool executed successfully', { graphName });
        
        return {
          content: [{
            type: "text",
            text: `Graph ${graphName} deleted`
          }]
        };
      } catch (error) {
        await logger.error('Delete graph tool execution failed', error instanceof Error ? error : new Error(String(error)), { graphName });
        throw error;
      }
    }
  );
}

function registerListKeysTool(server: McpServer): void {
  server.registerTool(
    "list_keys",
    {
      title: "List Keys",
      description: "List all keys in Redis",
      inputSchema: {},
    },
    async () => {
      try {
        const keys = await redisService.listKeys();
        await logger.debug('List keys tool executed', { count: keys.length });
        
        return {
          content: [{
            type: "text",
            text: keys.join("\n"),
          }]
        };
      } catch (error) {
        await logger.error('List keys tool execution failed', error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    }
  );
}

function registerSetKeyTool(server: McpServer): void {
  // Register set_key tool
  server.registerTool(
    "set_key",
    {
      title: "Set Key",
      description: "Set a key in Redis",
      inputSchema: {
        key: z.string().describe("The key to set"),
        value: z.string().describe("The value to set"),
      },
    },
    async ({key, value}) => {
      try {
        if (!key?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Key is required and cannot be empty',
            true
          );
        }
        
        if (value === undefined || value === null) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Value is required',
            true
          );
        }
        
        await redisService.set(key, value);
        await logger.debug('Set key tool executed successfully', { key });
        
        return {
          content: [{
            type: "text",
            text: `Key ${key} set to ${value}`
          }]
        };
      } catch (error) {
        await logger.error('Set key tool execution failed', error instanceof Error ? error : new Error(String(error)), { key });
        throw error;
      }
    }
  );
}

function registerGetKeyTool(server: McpServer): void {
  // Register get_key tool
  server.registerTool(
    "get_key",
    {
      title: "Get Key",
      description: "Get a key from Redis",
      inputSchema: {
        key: z.string().describe("The key to get."),
      },
    },
    async ({key}) => {
      try {
        if (!key?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Key is required and cannot be empty',
            true
          );
        }
        
        const value = await redisService.get(key);
        await logger.debug('Get key tool executed successfully', { key, hasValue: value !== null });
        
        return {
          content: [{
            type: "text",
            text: `Key ${key} is ${value ?? 'null (not found)'}`
          }]
        };
      } catch (error) {
        await logger.error('Get key tool execution failed', error instanceof Error ? error : new Error(String(error)), { key });
        throw error;
      }
    }
  );
}

function registerDeleteKeyTool(server: McpServer): void {
  server.registerTool(
    "delete_key",
    {
      title: "Delete Key",
      description: "Delete a key from Redis",
      inputSchema: {
        key: z.string().describe("The key to delete"),
      },
    },
    async ({key}) => {
      try {
        if (!key?.trim()) {
          throw new AppError(
            CommonErrors.INVALID_INPUT,
            'Key is required and cannot be empty',
            true
          );
        }

        await redisService.delete(key);
        await logger.debug('Delete key tool executed successfully', { key });

        return {
          content: [{
            type: "text",
            text: `Key ${key} deleted`
          }]
        };
      } catch (error) {
        await logger.error('Delete key tool execution failed', error instanceof Error ? error : new Error(String(error)), { key });
        throw error;
      }
    }
  )
}

export default function registerAllTools(server: McpServer): void {
  // Register query_graph tool
  registerQueryGraphTool(server);
  registerListGraphsTool(server);
  registerDeleteGraphTool(server);
  registerSetKeyTool(server);
  registerGetKeyTool(server);
  registerDeleteKeyTool(server);
  registerListKeysTool(server);
}