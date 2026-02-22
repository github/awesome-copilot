---
description: 'Generate a complete Model Context Protocol server project in Ruby using the official MCP Ruby SDK gem.'
agent: agent
---

# Ruby MCP Server Generator

Generate a complete, production-ready MCP server in Ruby using the official Ruby SDK.

## Project Generation

When asked to create a Ruby MCP server, generate a complete project with this structure:

```
my-mcp-server/
├── Gemfile
├── Rakefile
├── lib/
│   ├── my_mcp_server.rb
│   ├── my_mcp_server/
│   │   ├── server.rb
│   │   ├── tools/
│   │   │   ├── greet_tool.rb
│   │   │   └── calculate_tool.rb
│   │   ├── prompts/
│   │   │   └── code_review_prompt.rb
│   │   └── resources/
│   │       └── example_resource.rb
├── bin/
│   └── mcp-server
├── test/
│   ├── test_helper.rb
│   └── tools/
│       ├── greet_tool_test.rb
│       └── calculate_tool_test.rb
└── README.md
```

## Gemfile Template

```ruby
source 'https://rubygems.org'

gem 'mcp', '~> 0.4.0'

group :development, :test do
  gem 'minitest', '~> 5.0'
  gem 'rake', '~> 13.0'
  gem 'rubocop', '~> 1.50'
end
```

## Rakefile Template

```ruby
require 'rake/testtask'
require 'rubocop/rake_task'

Rake::TestTask.new(:test) do |t|
  t.libs << 'test'
  t.libs << 'lib'
  t.test_files = FileList['test/**/*_test.rb']
end

RuboCop::RakeTask.new

task default: %i[test rubocop]
```

## lib/my_mcp_server.rb Template

```ruby
# frozen_string_literal: true

require 'mcp'
require_relative 'my_mcp_server/server'
require_relative 'my_mcp_server/tools/greet_tool'
require_relative 'my_mcp_server/tools/calculate_tool'
require_relative 'my_mcp_server/prompts/code_review_prompt'
require_relative 'my_mcp_server/resources/example_resource'

module MyMcpServer
  VERSION = '1.0.0'
end
```

## lib/my_mcp_server/server.rb Template

```ruby
# frozen_string_literal: true

module MyMcpServer
  class Server
    attr_reader :mcp_server
    
    def initialize(server_context: {})
      @mcp_server = MCP::Server.new(
        name: 'my_mcp_server',
        version: MyMcpServer::VERSION,
        tools: [
          Tools::GreetTool,
          Tools::CalculateTool
        ],
        prompts: [
          Prompts::CodeReviewPrompt
        ],
        resources: [
          Resources::ExampleResource.resource
        ],
        server_context: server_context
      )
      
      setup_resource_handler
    end
    
    def handle_json(json_string)
      mcp_server.handle_json(json_string)
    end
    
    def start_stdio
      transport = MCP::Server::Transports::StdioTransport.new(mcp_server)
      transport.open
    end
    
    private
    
    def setup_resource_handler
      mcp_server.resources_read_handler do |params|
        Resources::ExampleResource.read(params[:uri])
      end
    end
  end
end
```

## lib/my_mcp_server/tools/greet_tool.rb Template

```ruby
# frozen_string_literal: true

module MyMcpServer
  module Tools
    class GreetTool < MCP::Tool
      tool_name 'greet'
      description 'Generate a greeting message'
      
      input_schema(
        properties: {
          name: {
            type: 'string',
            description: 'Name to greet'
          }
        },
        required: ['name']
      )
      
      output_schema(
        properties: {
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' }
        },
        required: ['message', 'timestamp']
      )
      
      annotations(
        read_only_hint: true,
        idempotent_hint: true
      )
      
      def self.call(name:, server_context:)
        timestamp = Time.now.iso8601
        message = "Hello, #{name}! Welcome to MCP."
        
        structured_data = {
          message: message,
          timestamp: timestamp
        }
        
        MCP::Tool::Response.new(
          [{ type: 'text', text: message }],
          structured_content: structured_data
        )
      end
    end
  end
end
```

## lib/my_mcp_server/tools/calculate_tool.rb Template

```ruby
# frozen_string_literal: true

module MyMcpServer
  module Tools
    class CalculateTool < MCP::Tool
      tool_name 'calculate'
      description 'Perform mathematical calculations'
      
      input_schema(
        properties: {
          operation: {
            type: 'string',
            description: 'Operation to perform',
            enum: ['add', 'subtract', 'multiply', 'divide']
          },
          a: {
            type: 'number',
            description: 'First operand'
          },
          b: {
            type: 'number',
            description: 'Second operand'
          }
        },
        required: ['operation', 'a', 'b']
      )
      
      output_schema(
        properties: {
          result: { type: 'number' },
          operation: { type: 'string' }
        },
        required: ['result', 'operation']
      )
      
      annotations(
        read_only_hint: true,
        idempotent_hint: true
      )
      
      def self.call(operation:, a:, b:, server_context:)
        result = case operation
                 when 'add' then a + b
                 when 'subtract' then a - b
                 when 'multiply' then a * b
                 when 'divide'
                   return error_response('Division by zero') if b.zero?
                   a / b.to_f
                 else
                   return error_response("Unknown operation: #{operation}")
                 end
        
        structured_data = {
          result: result,
          operation: operation
        }
        
        MCP::Tool::Response.new(
          [{ type: 'text', text: "Result: #{result}" }],
          structured_content: structured_data
        )
      end
      
      def self.error_response(message)
        MCP::Tool::Response.new(
          [{ type: 'text', text: message }],
          is_error: true
        )
      end
    end
  end
end
```

## lib/my_mcp_server/prompts/code_review_prompt.rb Template

```ruby
# frozen_string_literal: true

module MyMcpServer
  module Prompts
    class CodeReviewPrompt < MCP::Prompt
      prompt_name 'code_review'
      description 'Generate a code review prompt'
      
      arguments [
        MCP::Prompt::Argument.new(
          name: 'language',
          description: 'Programming language',
          required: true
        ),
        MCP::Prompt::Argument.new(
          name: 'focus',
          description: 'Review focus area (e.g., performance, security)',
          required: false
        )
      ]
      
      meta(
        version: '1.0',
        category: 'development'
      )
      
      def self.template(args, server_context:)
        language = args['language'] || 'Ruby'
        focus = args['focus'] || 'general quality'
        
        MCP::Prompt::Result.new(
          description: "Code review for #{language} with focus on #{focus}",
          messages: [
            MCP::Prompt::Message.new(
              role: 'user',
              content: MCP::Content::Text.new(
                "Please review this #{language} code with focus on #{focus}."
              )
            ),
            MCP::Prompt::Message.new(
              role: 'assistant',
              content: MCP::Content::Text.new(
                "I'll review the code focusing on #{focus}. Please share the code."
              )
            ),
            MCP::Prompt::Message.new(
              role: 'user',
              content: MCP::Content::Text.new(
                '[paste code here]'
              )
            )
          ]
        )
      end
    end
  end
end
```

## lib/my_mcp_server/resources/example_resource.rb Template

```ruby
# frozen_string_literal: true

module MyMcpServer
  module Resources
    class ExampleResource
      RESOURCE_URI = 'resource://data/example'
      
      def self.resource
        MCP::Resource.new(
          uri: RESOURCE_URI,
          name: 'example-data',
          description: 'Example resource data',
          mime_type: 'application/json'
        )
      end
      
      def self.read(uri)
        return [] unless uri == RESOURCE_URI
        
        data = {
          message: 'Example resource data',
          timestamp: Time.now.iso8601,
          version: MyMcpServer::VERSION
        }
        
        [{
          uri: uri,
          mimeType: 'application/json',
          text: data.to_json
        }]
      end
    end
  end
end
```

## bin/mcp-server Template

```ruby
#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative '../lib/my_mcp_server'

begin
  server = MyMcpServer::Server.new
  server.start_stdio
rescue Interrupt
  warn "\nShutting down server..."
  exit 0
rescue StandardError => e
  warn "Error: #{e.message}"
  warn e.backtrace.join("\n")
  exit 1
end
```

Make the file executable:
```bash
chmod +x bin/mcp-server
```

## test/test_helper.rb Template

```ruby
# frozen_string_literal: true

$LOAD_PATH.unshift File.expand_path('../lib', __dir__)
require 'my_mcp_server'
require 'minitest/autorun'
```

## test/tools/greet_tool_test.rb Template

```ruby
# frozen_string_literal: true

require 'test_helper'

module MyMcpServer
  module Tools
    class GreetToolTest < Minitest::Test
      def test_greet_with_name
        response = GreetTool.call(
          name: 'Ruby',
          server_context: {}
        )
        
        refute response.is_error
        assert_equal 1, response.content.length
        assert_match(/Ruby/, response.content.first[:text])
        
        assert response.structured_content
        assert_equal 'Hello, Ruby! Welcome to MCP.', response.structured_content[:message]
      end
      
      def test_output_schema_validation
        response = GreetTool.call(
          name: 'Test',
          server_context: {}
        )
        
        assert response.structured_content.key?(:message)
        assert response.structured_content.key?(:timestamp)
      end
    end
  end
end
```

## test/tools/calculate_tool_test.rb Template

```ruby
# frozen_string_literal: true

require 'test_helper'

module MyMcpServer
  module Tools
    class CalculateToolTest < Minitest::Test
      def test_addition
        response = CalculateTool.call(
          operation: 'add',
          a: 5,
          b: 3,
          server_context: {}
        )
        
        refute response.is_error
        assert_equal 8, response.structured_content[:result]
      end
      
      def test_subtraction
        response = CalculateTool.call(
          operation: 'subtract',
          a: 10,
          b: 4,
          server_context: {}
        )
        
        refute response.is_error
        assert_equal 6, response.structured_content[:result]
      end
      
      def test_multiplication
        response = CalculateTool.call(
          operation: 'multiply',
          a: 6,
          b: 7,
          server_context: {}
        )
        
        refute response.is_error
        assert_equal 42, response.structured_content[:result]
      end
      
      def test_division
        response = CalculateTool.call(
          operation: 'divide',
          a: 15,
          b: 3,
          server_context: {}
        )
        
        refute response.is_error
        assert_equal 5.0, response.structured_content[:result]
      end
      
      def test_division_by_zero
        response = CalculateTool.call(
          operation: 'divide',
          a: 10,
          b: 0,
          server_context: {}
        )
        
        assert response.is_error
        assert_match(/Division by zero/, response.content.first[:text])
      end
      
      def test_unknown_operation
        response = CalculateTool.call(
          operation: 'modulo',
          a: 10,
          b: 3,
          server_context: {}
        )
        
        assert response.is_error
        assert_match(/Unknown operation/, response.content.first[:text])
      end
    end
  end
end
```

## README.md Template

```markdown
# My MCP Server

A Model Context Protocol server built with Ruby and the official MCP Ruby SDK.

## Features

- ✅ Tools: greet, calculate
- ✅ Prompts: code_review
- ✅ Resources: example-data
- ✅ Input/output schemas
- ✅ Tool annotations
- ✅ Structured content
- ✅ Full test coverage

## Requirements

- Ruby 3.0 or later

## Installation

```bash
bundle install
```

## Usage

### Stdio Transport

Run the server:

```bash
bundle exec bin/mcp-server
```

Then send JSON-RPC requests:

```bash
{"jsonrpc":"2.0","id":"1","method":"ping"}
{"jsonrpc":"2.0","id":"2","method":"tools/list"}
{"jsonrpc":"2.0","id":"3","method":"tools/call","params":{"name":"greet","arguments":{"name":"Ruby"}}}
```

### Rails Integration

Add to your Rails controller:

```ruby
class McpController < ApplicationController
  def index
    server = MyMcpServer::Server.new(
      server_context: { user_id: current_user.id }
    )
    render json: server.handle_json(request.body.read)
  end
end
```

## Testing

Run tests:

```bash
bundle exec rake test
```

Run linter:

```bash
bundle exec rake rubocop
```

Run all checks:

```bash
bundle exec rake
```

## Integration with Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "bundle",
      "args": ["exec", "bin/mcp-server"],
      "cwd": "/path/to/my-mcp-server"
    }
  }
}
```

## Project Structure

```
my-mcp-server/
├── Gemfile              # Dependencies
├── Rakefile             # Build tasks
├── lib/                 # Source code
│   ├── my_mcp_server.rb # Main entry point
│   └── my_mcp_server/   # Module namespace
│       ├── server.rb    # Server setup
│       ├── tools/       # Tool implementations
│       ├── prompts/     # Prompt templates
│       └── resources/   # Resource handlers
├── bin/                 # Executables
│   └── mcp-server       # Stdio server
├── test/                # Test suite
│   ├── test_helper.rb   # Test configuration
│   └── tools/           # Tool tests
└── README.md            # This file
```

## License

MIT
```

## Generation Instructions

1. **Ask for project name and description**
2. **Generate all files** with proper naming and module structure
3. **Use classes for tools and prompts** for better organization
4. **Include input/output schemas** for type safety
5. **Add tool annotations** for behavior hints
6. **Include structured content** in responses
7. **Implement comprehensive tests** for all tools
8. **Follow Ruby conventions** (snake_case, modules, frozen_string_literal)
9. **Add proper error handling** with is_error flag
10. **Provide both stdio and HTTP** usage examples
