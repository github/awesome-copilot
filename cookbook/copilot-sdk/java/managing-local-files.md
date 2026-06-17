# Grouping Files by Metadata

Use Copilot to intelligently organize files in a folder based on their metadata.

> **Runnable example:** [recipe/ManagingLocalFiles.java](recipe/ManagingLocalFiles.java)
>
> ```bash
> jbang recipe/ManagingLocalFiles.java
> ```

## Example scenario

You have a folder with many files and want to organize them into subfolders based on metadata like file type, creation date, size, or other attributes. Copilot can analyze the files and suggest or execute a grouping strategy.

## Example code

**Usage:**
```bash
# Use with a specific folder (recommended)
jbang recipe/ManagingLocalFiles.java /path/to/your/folder

# Or run without arguments to use a safe default (temp directory)
jbang recipe/ManagingLocalFiles.java
```

**Code:**
```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.events.SessionIdleEvent;
import com.github.copilot.sdk.events.ToolExecutionCompleteEvent;
import com.github.copilot.sdk.events.ToolExecutionStartEvent;
import com.github.copilot.sdk.json.MessageOptions;
import com.github.copilot.sdk.json.PermissionHandler;
import com.github.copilot.sdk.json.SessionConfig;
import java.nio.file.Paths;
import java.util.concurrent.CountDownLatch;

public class ManagingLocalFiles {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Create session
            var session = client.createSession(
                new SessionConfig().setOnPermissionRequest(PermissionHandler.APPROVE_ALL).setModel("gpt-5")).get();

            // Set up event handlers
            var done = new CountDownLatch(1);

            session.on(AssistantMessageEvent.class, msg -> 
                System.out.println("\nCopilot: " + msg.getData().content())
            );

            session.on(ToolExecutionStartEvent.class, evt -> 
                System.out.println("  → Running: " + evt.getData().toolName())
            );

            session.on(ToolExecutionCompleteEvent.class, evt -> 
                System.out.println("  ✓ Completed: " + evt.getData().toolCallId())
            );

            session.on(SessionIdleEvent.class, evt -> done.countDown());

            // Ask Copilot to organize files - using a safe example folder
            // For real use, replace with your target folder
            String targetFolder = args.length > 0 ? args[0] : 
                System.getProperty("java.io.tmpdir") + "/example-files";

            String prompt = String.format("""
                Analyze the files in "%s" and show how you would organize them into subfolders.

                1. First, list all files and their metadata
                2. Preview grouping by file extension
                3. Suggest appropriate subfolders (e.g., "images", "documents", "videos")
                
                IMPORTANT: DO NOT move any files. Only show the plan.
                """, targetFolder);

            session.send(new MessageOptions().setPrompt(prompt));

            // Wait for completion
            done.await();

            session.close();
        }
    }
}
```

## Grouping strategies

### By file extension

```java
// Groups files like:
// images/   -> .jpg, .png, .gif
// documents/ -> .pdf, .docx, .txt
// videos/   -> .mp4, .avi, .mov
```

### By creation date

```java
// Groups files like:
// 2024-01/ -> files created in January 2024
// 2024-02/ -> files created in February 2024
```

### By file size

```java
// Groups files like:
// tiny-under-1kb/
// small-under-1mb/
// medium-under-100mb/
// large-over-100mb/
```

## Dry-run mode

For safety, you can ask Copilot to only preview changes:

```java
String prompt = String.format("""
    Analyze files in "%s" and show me how you would organize them
    by file type. DO NOT move any files - just show me the plan.
    """, targetFolder);

session.send(new MessageOptions().setPrompt(prompt));
```

## Custom grouping with AI analysis

Let Copilot determine the best grouping based on file content:

```java
String prompt = String.format("""
    Look at the files in "%s" and suggest a logical organization.
    Consider:
    - File names and what they might contain
    - File types and their typical uses
    - Date patterns that might indicate projects or events

    Propose folder names that are descriptive and useful.
    """, targetFolder);

session.send(new MessageOptions().setPrompt(prompt));
```

## Interactive file organization

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.json.MessageOptions;
import com.github.copilot.sdk.json.PermissionHandler;
import com.github.copilot.sdk.json.SessionConfig;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class InteractiveFileOrganizer {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient();
             var reader = new BufferedReader(new InputStreamReader(System.in))) {
            
            client.start().get();

            var session = client.createSession(
                new SessionConfig().setOnPermissionRequest(PermissionHandler.APPROVE_ALL).setModel("gpt-5")).get();

            session.on(AssistantMessageEvent.class, msg -> 
                System.out.println("\nCopilot: " + msg.getData().content())
            );

            System.out.print("Enter folder path to organize: ");
            String folderPath = reader.readLine();

            String initialPrompt = String.format("""
                Analyze the files in "%s" and suggest an organization strategy.
                Wait for my confirmation before making any changes.
                """, folderPath);

            session.send(new MessageOptions().setPrompt(initialPrompt));

            // Interactive loop
            System.out.println("\nEnter commands (or 'exit' to quit):");
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.equalsIgnoreCase("exit")) {
                    break;
                }
                session.send(new MessageOptions().setPrompt(line));
            }

            session.close();
        }
    }
}
```

## Safety considerations

1. **Confirm before moving**: Ask Copilot to confirm before executing moves
2. **Handle duplicates**: Consider what happens if a file with the same name exists
3. **Preserve originals**: Consider copying instead of moving for important files
4. **Test with dry-run**: Always test with a dry-run first to preview the changes
