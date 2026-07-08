// MCP server exposing the same search capability as a tool, so any AI agent
// (not just this project's own UI) can call search_fim_mim_archive(query).
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");
const { search } = require("../api/search");

const server = new McpServer({ name: "mim-archive-reviver", version: "0.1.0" });

server.registerTool(
  "search_fim_mim_archive",
  {
    title: "Search the FIM/MIM TechNet archive",
    description:
      "Semantic search over the archived TechNet Wiki content for Microsoft FIM/MIM (Forefront/Microsoft Identity Manager). Returns the most relevant excerpts with source URLs.",
    inputSchema: {
      query: z.string().describe("Natural-language question or keywords about FIM/MIM"),
    },
  },
  async ({ query }) => {
    const results = await search(query, 5);
    const text = results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.text.slice(0, 500)}`)
      .join("\n\n");
    return { content: [{ type: "text", text: text || "No results found." }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
