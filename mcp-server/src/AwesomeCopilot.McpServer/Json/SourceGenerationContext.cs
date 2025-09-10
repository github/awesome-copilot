using System.Text.Json.Serialization;

namespace AwesomeCopilot.McpServer.Json
{
  // Source-generated JsonSerializerContext to provide JsonTypeInfo metadata for AOT trimming
  [JsonSourceGenerationOptions(PropertyNameCaseInsensitive = true)]
  [JsonSerializable(typeof(Models.Metadata))]
  [JsonSerializable(typeof(Models.ChatMode))]
  [JsonSerializable(typeof(Models.Instruction))]
  [JsonSerializable(typeof(Models.Prompt))]
  [JsonSerializable(typeof(Models.MetadataResult))]
  [JsonSerializable(typeof(Tools.InstructionMode))]
  public partial class SourceGenerationContext : JsonSerializerContext
  {
    // The source generator will provide the Default instance and JsonTypeInfo data.
  }
}
