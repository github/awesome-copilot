namespace AwesomeCopilot.McpServer.Models;

/// <summary>
/// This represents the data entity for a prompt.
/// </summary>
public class Prompt
{
    /// <summary>
    /// Gets or sets the name of the prompt file.
    /// </summary>
    public required string Filename { get; set; }

    /// <summary>
    /// Gets or sets the description.
    /// </summary>
    public required string Description { get; set; }

    /// <summary>
    /// Gets or sets the execution mode.
    /// </summary>
    public string? Mode { get; set; }

    /// <summary>
    /// Gets or sets the list of tools.
    /// </summary>
    public List<string>? Tools { get; set; }
}
