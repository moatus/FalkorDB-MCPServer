import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function registerUserSetupPrompt(server: McpServer): void {
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

function registerMemoryQueryPrompt(server: McpServer): void {
  server.registerPrompt(
    "memory_query",
    {
      title: "Memory Query",
      description: "Query the memory graph to retrieve and analyze stored information",
      argsSchema: {
        query: z.string().describe("The query or topic to search for in memory"),
        context: z.string().optional().describe("Additional context to help scope the search"),
        relationship_depth: z.string().describe("How many relationship hops to traverse (1-3)")
      }
    },
    async ({query, context, relationship_depth}) => {
      const memoryMessage = `# Memory Query Task

You are working with a FalkorDB graph database to retrieve and analyze stored memory information.

**Query Information:**
- Search Query: ${query}
${context ? `- Additional Context: ${context}` : ''}
- Relationship Depth: ${relationship_depth} hops

**Your task is to:**

1. **Search for relevant nodes**: Use Cypher queries to find nodes that match or relate to "${query}"
   - Look for nodes with matching names, properties, or content
   - Consider partial matches and semantic relationships
   
2. **Traverse relationships**: Explore connected nodes up to ${relationship_depth} relationship hops to gather context:
   - Follow relationships like RELATES_TO, MENTIONED_IN, CONNECTED_TO
   - Include timestamps and relationship properties
   
3. **Analyze and synthesize**: Process the retrieved information to:
   - Identify key patterns and connections
   - Extract relevant facts and relationships
   - Organize information chronologically or by relevance
   
4. **Provide structured results**: Format your findings including:
   - Direct matches and their properties
   - Related nodes and connection paths
   - Temporal patterns if applicable
   - Confidence levels for relationships

**Query Guidelines:**
- Use MATCH patterns to find relevant nodes
- Utilize WHERE clauses for filtering
- Consider using OPTIONAL MATCH for related information
- Include LIMIT clauses to manage result size
- Order results by relevance or timestamp

**Example Cypher patterns:**
\`\`\`cypher
MATCH (n) WHERE n.name CONTAINS "${query}" OR n.content CONTAINS "${query}"
MATCH (n)-[r*1..${relationship_depth}]-(related)
RETURN n, r, related ORDER BY n.timestamp DESC
\`\`\`

Please proceed with querying the memory graph for information about "${query}".`

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: memoryMessage
            }
          }
        ]
      }
    }
  )
}


export default function registerAllPrompts(server: McpServer): void {
  registerUserSetupPrompt(server);
  registerMemoryQueryPrompt(server);
}