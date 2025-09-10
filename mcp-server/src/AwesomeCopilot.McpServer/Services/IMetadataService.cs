using AwesomeCopilot.McpServer.Models;

namespace AwesomeCopilot.McpServer.Services;

/// <summary>
/// This provides interfaces for metadata service operations.
/// </summary>
public interface IMetadataService
{
    /// <summary>
    /// Searches for relevant data in chatmodes, instructions, and prompts based on keywords in their description fields
    /// </summary>
    /// <param name="keywords">The keywords to search for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Returns <see cref="Metadata"/> object containing all matching search results</returns>
    Task<Metadata> SearchAsync(string keywords, CancellationToken cancellationToken = default);

    /// <summary>
    /// Loads file contents from the awesome-copilot repository
    /// </summary>
    /// <param name="directory">The mode directory (chatmodes, instructions, or prompts)</param>
    /// <param name="filename">The filename to load</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Returns the file contents as a string</returns>
    Task<string> LoadAsync(string directory, string filename, CancellationToken cancellationToken = default);
}
