using System.Text.Json.Serialization;

namespace AwesomeCopilot.McpServer.Tools;

[JsonConverter(typeof(JsonStringEnumConverter<InstructionMode>))]
public enum InstructionMode
{
    [JsonStringEnumMemberName("undefined")]
    Undefined,

    [JsonStringEnumMemberName("chatmodes")]
    ChatModes,

    [JsonStringEnumMemberName("instructions")]
    Instructions,

    [JsonStringEnumMemberName("prompts")]
    Prompts
}
