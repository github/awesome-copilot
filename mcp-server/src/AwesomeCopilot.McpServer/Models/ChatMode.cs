namespace AwesomeCopilot.McpServer.Models;

/// <summary>
/// This represents the data entity for a chat mode.
/// </summary>
public class ChatMode
{
    /// <summary>
    /// Gets or sets the name of the chat mode file.
    /// </summary>
    public required string Filename { get; set; }

    /// <summary>
    /// Gets or sets the title.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the description.
    /// </summary>
    public required string Description { get; set; }

    /// <summary>
    /// Gets or sets the AI model.
    /// </summary>
    public string? Model { get; set; }

    /// <summary>
    /// Gets or sets the list of tools.
    /// </summary>
    public List<string> Tools { get; set; } = [];
}
