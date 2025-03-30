/**
 * MCP Client Configuration Types
 */

export interface MCPServerConfig {
    mcpServers: {
      [key: string]: {
        command: string;
        args: string[];
      };
    };
  }
  
  export interface MCPClientConfig {
    defaultServer?: string;
    servers: {
      [key: string]: {
        url: string;
        apiKey?: string;
      };
    };
  }
  
  /**
   * Sample MCP Client Configuration
   */
  export const sampleMCPClientConfig: MCPClientConfig = {
    defaultServer: "falkordb",
    servers: {
      "falkordb": {
        url: "http://localhost:3000/api/mcp",
        apiKey: "your_api_key_here"
      }
    }
  };
  
  /**
   * Sample MCP Server Configuration
   */
  export const sampleMCPServerConfig: MCPServerConfig = {
    mcpServers: {
      "falkordb": {
        command: "docker",
        args: [
          "run",
          "-i",
          "--rm",
          "-p", "3000:3000",
          "--env-file", ".env",
          "falkordb-mcp-server",
          "falkordb://host.docker.internal:6379"
        ]
      }
    }
  };