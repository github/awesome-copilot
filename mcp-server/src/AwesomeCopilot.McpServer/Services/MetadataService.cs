using System.Text.Json;
using AwesomeCopilot.McpServer.Json;
using AwesomeCopilot.McpServer.Models;

namespace AwesomeCopilot.McpServer.Services;

/// <summary>
/// This represents the service entity for searching and loading custom instructions from the awesome-copilot repository.
/// </summary>
public class MetadataService(HttpClient http, JsonSerializerOptions options, ILogger<MetadataService> logger) : IMetadataService
{
  private const string MetadataFileName = "metadata.json";
  private const string AwesomeCopilotFileUrl = "https://raw.githubusercontent.com/github/awesome-copilot/refs/heads/main/{directory}/{filename}";

  private readonly string _metadataFilePath = Path.Combine(AppContext.BaseDirectory, MetadataFileName);
  private Metadata? _cachedMetadata;

  /// <inheritdoc />
  public async Task<Metadata> SearchAsync(string keywords, CancellationToken cancellationToken = default)
  {
    if (string.IsNullOrWhiteSpace(keywords) == true)
    {
      return new Metadata();
    }

    var metadata = await GetMetadataAsync(cancellationToken).ConfigureAwait(false);
    var searchTerms = keywords.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                              .Select(term => term.Trim().ToLowerInvariant())
                              .Where(term => string.IsNullOrWhiteSpace(term) != true)
                              .ToArray();

    logger.LogInformation("Search terms: {terms}", string.Join(", ", searchTerms));

    var result = new Metadata
    {
      // Search in ChatModes
      ChatModes = [.. metadata.ChatModes.Where(cm => ContainsAnyKeyword(cm.Title, searchTerms) == true ||
                                                           ContainsAnyKeyword(cm.Description, searchTerms) == true)],

      // Search in Instructions
      Instructions = [.. metadata.Instructions.Where(inst => ContainsAnyKeyword(inst.Title, searchTerms) == true ||
                                                                   ContainsAnyKeyword(inst.Description, searchTerms) == true)],

      // Search in Prompts
      Prompts = [.. metadata.Prompts.Where(prompt => ContainsAnyKeyword(prompt.Description, searchTerms) == true)]
    };

    return result;
  }

  /// <inheritdoc />
  public async Task<string> LoadAsync(string directory, string filename, CancellationToken cancellationToken = default)
  {
    if (string.IsNullOrWhiteSpace(directory) == true)
    {
      throw new ArgumentException("Directory cannot be null or empty", nameof(directory));
    }

    if (string.IsNullOrWhiteSpace(filename) == true)
    {
      throw new ArgumentException("Filename cannot be null or empty", nameof(filename));
    }

    var url = AwesomeCopilotFileUrl.Replace("{directory}", directory).Replace("{filename}", filename);
    try
    {
      var response = await http.GetAsync(url, cancellationToken).ConfigureAwait(false);
      response.EnsureSuccessStatusCode();

      var content = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false);

      logger.LogInformation("Loaded content from {url}", url);

      return content;
    }
    catch (HttpRequestException ex)
    {
      throw new InvalidOperationException($"Failed to load file '{filename}' from directory '{directory}': {ex.Message}", ex);
    }
  }

  private async Task<Metadata> GetMetadataAsync(CancellationToken cancellationToken)
  {
    if (_cachedMetadata != null)
    {
      return _cachedMetadata;
    }

    if (File.Exists(_metadataFilePath) != true)
    {
      throw new FileNotFoundException($"Metadata file not found at: {_metadataFilePath}");
    }

    var json = await File.ReadAllTextAsync(_metadataFilePath, cancellationToken).ConfigureAwait(false);
    _cachedMetadata = JsonSerializer.Deserialize<Metadata>(json, options)
              ?? throw new InvalidOperationException("Failed to deserialize metadata");

    return _cachedMetadata;
  }

  private static bool ContainsAnyKeyword(string? text, string[] searchTerms)
  {
    if (string.IsNullOrWhiteSpace(text))
    {
      return false;
    }

    var result = searchTerms.Any(term => text.Contains(term, StringComparison.InvariantCultureIgnoreCase) == true);

    return result;
  }
}
