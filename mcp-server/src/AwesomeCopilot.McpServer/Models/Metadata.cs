using System.Text.Json.Serialization;

namespace AwesomeCopilot.McpServer.Models;

/// <summary>
/// This represents the data entity for metadata.json.
/// </summary>
public class Metadata
{
    /// <summary>
    /// Gets or sets the list of <see cref="ChatMode"/> objects.
    /// </summary>
    [JsonPropertyName("chatmodes")]
    public List<ChatMode> ChatModes { get; set; } = [];

    /// <summary>
    /// Gets or sets the list of <see cref="Instruction"/> objects.
    /// </summary>
    public List<Instruction> Instructions { get; set; } = [];

    /// <summary>
    /// Gets or sets the list of <see cref="Prompt"/> objects.
    /// </summary>
    public List<Prompt> Prompts { get; set; } = [];
}
