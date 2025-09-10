using System.ComponentModel;

using ModelContextProtocol.Server;

namespace AwesomeCopilot.McpServer.Prompts;

/// <summary>
/// This provides interfaces for metadata prompts.
/// </summary>
public interface IMetadataPrompt
{
    /// <summary>
    /// Gets a prompt for searching copilot instructions.
    /// </summary>
    /// <param name="keyword">The keyword to search for.</param>
    /// <returns>A formatted search prompt.</returns>
    string GetSearchPrompt(string keyword);
}

/// <summary>
/// This represents the prompts entity for the awesome-copilot repository.
/// </summary>
[McpServerPromptType]
public class MetadataPrompt : IMetadataPrompt
{
    /// <inheritdoc />
    [McpServerPrompt(Name = "get_search_prompt", Title = "Prompt for searching copilot instructions")]
    [Description("Get a prompt for searching copilot instructions.")]
    public string GetSearchPrompt(
        [Description("The keyword to search for")] string keyword)
    {
        return $"""
        Please search all the chatmodes, instructions and prompts that are related to the search keyword, `{keyword}`.

        Here's the process to follow:

        1. Use the `awesome-copilot` MCP server.
        1. Search all chatmodes, instructions, and prompts for the keyword provided.
        1. DO NOT load any chatmodes, instructions, or prompts from the MCP server until the user asks to do so.
        1. Scan local chatmodes, instructions, and prompts markdown files in `.github/chatmodes`, `.github/instructions`, and `.github/prompts` directories respectively.
        1. Compare existing chatmodes, instructions, and prompts with the search results.
        1. Provide a structured response in a table format that includes the already exists, mode (chatmodes, instructions or prompts), filename, title and description of each item found.
           Here's an example of the table format:

           | Exists | Mode         | Filename               | Title         | Description   |
           |--------|--------------|------------------------|---------------|---------------|
           | ✅    | chatmodes    | chatmode1.json         | ChatMode 1    | Description 1 |
           | ❌    | instructions | instruction1.json      | Instruction 1 | Description 1 |
           | ✅    | prompts      | prompt1.json           | Prompt 1      | Description 1 |

           ✅ indicates that the item already exists in this repository, while ❌ indicates that it does not.

        1. If any item doesn't exist in the repository, ask which item the user wants to save.
        1. If the user wants to save it, save the item in the appropriate directory (`.github/chatmodes`, `.github/instructions`, or `.github/prompts`)
           using the mode and filename, with NO modification.
        """;
    }
}
