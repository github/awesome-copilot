namespace AwesomeCopilot.McpServer.Models;

/// <summary>
/// This represents the data entity for an instruction.
/// </summary>
public class Instruction
{
    /// <summary>
    /// Gets or sets the name of the instruction file.
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
    /// Gets or sets the file patterns that this instruction applies to.
    /// </summary>
    public List<string> ApplyTo { get; set; } = [];
}
