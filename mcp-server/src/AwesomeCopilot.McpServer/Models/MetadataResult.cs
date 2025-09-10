namespace AwesomeCopilot.McpServer.Models;

/// <summary>
/// This represents the result entity to retrieve metadata.
/// </summary>
public class MetadataResult
{
    /// <summary>
    /// Gets or sets the <see cref="Metadata"/> object.
    /// </summary>
    public Metadata? Metadata { get; set; }

    /// <summary>
    /// Gets or sets the error message if any error occurs.
    /// </summary>
    public string? ErrorMessage { get; set; }
}
