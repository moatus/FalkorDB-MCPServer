import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export default function registerAllPrompts(server: McpServer): void {
  // Register graph_list resource
  server.registerPrompt(
    "user_setup",
    {
      title: "User Setup",
      description: "Setup the user graph node and connect it to the rest of the relevant nodes",
      argsSchema: {
        name: z.string().describe("The name of the user"),
      }
    },
    async ({name}) => {
      const userMessage = `# User Setup Task

You are working with a FalkorDB graph database to manage user information and relationships. 

**User Information:**
- Name: ${name}

**Your task is to:**

1. **Check if user exists**: Search for a node with the name "${name}" in the memory graph
2. **Create user node if needed**: If no node exists with this name, create a new user node with the following properties:
   - name: "${name}"
   - type: "User"
   - created_at: current timestamp
3. **Establish relationships**: Ensure the user node is properly connected to relevant nodes in the graph, such as:
   - Recent conversations or interactions
   - Associated topics or interests
   - Related entities or contexts

**Guidelines:**
- Use appropriate Cypher queries to search, create, and connect nodes
- Maintain data consistency and avoid duplicate user nodes
- Consider the existing graph structure when establishing new relationships
- Log any operations performed for debugging purposes

Please proceed with setting up the user "${name}" in the memory graph.`
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: userMessage
            }
          }
        ]
      }
    }
  )
}