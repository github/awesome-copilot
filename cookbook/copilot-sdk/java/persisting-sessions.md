# Session Persistence and Resumption

Save and restore conversation sessions across application restarts.

> **Runnable example:** [recipe/PersistingSessions.java](recipe/PersistingSessions.java)
>
> ```bash
> jbang recipe/PersistingSessions.java
> ```

## Example scenario

You want users to be able to continue a conversation even after closing and reopening your application. The Copilot SDK persists session state to disk automatically — you just need to provide a stable session ID and resume later.

## Creating a session with a custom ID

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.json.MessageOptions;
import com.github.copilot.sdk.json.PermissionHandler;
import com.github.copilot.sdk.json.SessionConfig;

public class CreateSessionWithId {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Create session with a memorable ID
            var session = client.createSession(
                new SessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setSessionId("user-123-conversation")
                    .setModel("gpt-5")
            ).get();

            session.on(AssistantMessageEvent.class, msg ->
                System.out.println(msg.getData().content())
            );

            session.sendAndWait(new MessageOptions()
                .setPrompt("Let's discuss TypeScript generics")).get();

            // Session ID is preserved
            System.out.println("Session ID: " + session.getSessionId());

            // Close session but keep data on disk
            session.close();
        }
    }
}
```

## Resuming a session

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.json.MessageOptions;
import com.github.copilot.sdk.json.PermissionHandler;
import com.github.copilot.sdk.json.ResumeSessionConfig;

public class ResumeSession {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Resume the previous session
            var session = client.resumeSession(
                "user-123-conversation",
                new ResumeSessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
            ).get();

            session.on(AssistantMessageEvent.class, msg ->
                System.out.println(msg.getData().content())
            );

            // Previous context is restored
            session.sendAndWait(new MessageOptions()
                .setPrompt("What were we discussing?")).get();

            session.close();
        }
    }
}
```

## Listing available sessions

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;

public class ListSessions {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            var sessions = client.listSessions().get();
            for (var sessionInfo : sessions) {
                System.out.println("Session: " + sessionInfo.getSessionId());
            }
        }
    }
}
```

## Deleting a session permanently

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;

public class DeleteSession {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Remove session and all its data from disk
            client.deleteSession("user-123-conversation").get();
            System.out.println("Session deleted");
        }
    }
}
```

## Getting session history

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.events.UserMessageEvent;
import com.github.copilot.sdk.json.PermissionHandler;
import com.github.copilot.sdk.json.ResumeSessionConfig;

public class SessionHistory {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            var session = client.resumeSession(
                "user-123-conversation",
                new ResumeSessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
            ).get();

            var messages = session.getMessages().get();
            for (var event : messages) {
                if (event instanceof AssistantMessageEvent msg) {
                    System.out.printf("[assistant] %s%n", msg.getData().content());
                } else if (event instanceof UserMessageEvent userMsg) {
                    System.out.printf("[user] %s%n", userMsg.getData().content());
                } else {
                    System.out.printf("[%s]%n", event.getType());
                }
            }

            session.close();
        }
    }
}
```

## Complete example with session management

This interactive example lets you create, resume, or list sessions from the command line.

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.events.AssistantMessageEvent;
import com.github.copilot.sdk.json.*;
import java.util.Scanner;

public class SessionManager {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient();
             var scanner = new Scanner(System.in)) {

            client.start().get();

            System.out.println("Session Manager");
            System.out.println("1. Create new session");
            System.out.println("2. Resume existing session");
            System.out.println("3. List sessions");
            System.out.print("Choose an option: ");

            int choice = scanner.nextInt();
            scanner.nextLine();

            switch (choice) {
                case 1 -> {
                    System.out.print("Enter session ID: ");
                    String sessionId = scanner.nextLine();
                    var session = client.createSession(
                        new SessionConfig()
                            .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                            .setSessionId(sessionId)
                            .setModel("gpt-5")
                    ).get();

                    session.on(AssistantMessageEvent.class, msg ->
                        System.out.println("\nCopilot: " + msg.getData().content())
                    );

                    System.out.println("Created session: " + sessionId);
                    chatLoop(session, scanner);
                    session.close();
                }

                case 2 -> {
                    System.out.print("Enter session ID to resume: ");
                    String resumeId = scanner.nextLine();
                    try {
                        var session = client.resumeSession(
                            resumeId,
                            new ResumeSessionConfig()
                                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                        ).get();

                        session.on(AssistantMessageEvent.class, msg ->
                            System.out.println("\nCopilot: " + msg.getData().content())
                        );

                        System.out.println("Resumed session: " + resumeId);
                        chatLoop(session, scanner);
                        session.close();
                    } catch (Exception ex) {
                        System.err.println("Failed to resume session: " + ex.getMessage());
                    }
                }

                case 3 -> {
                    var sessions = client.listSessions().get();
                    System.out.println("\nAvailable sessions:");
                    for (var s : sessions) {
                        System.out.println("  - " + s.getSessionId());
                    }
                }

                default -> System.out.println("Invalid choice");
            }
        }
    }

    static void chatLoop(Object session, Scanner scanner) throws Exception {
        System.out.println("\nStart chatting (type 'exit' to quit):");
        while (true) {
            System.out.print("\nYou: ");
            String input = scanner.nextLine();
            if (input.equalsIgnoreCase("exit")) break;

            // Use reflection-free approach: cast to the session type
            var s = (com.github.copilot.sdk.CopilotSession) session;
            s.sendAndWait(new MessageOptions().setPrompt(input)).get();
        }
    }
}
```

## Checking if a session exists

```java
//DEPS com.github:copilot-sdk-java:0.2.1-java.1
import com.github.copilot.sdk.CopilotClient;
import com.github.copilot.sdk.json.*;

public class CheckSession {
    public static boolean sessionExists(CopilotClient client, String sessionId) {
        try {
            var sessions = client.listSessions().get();
            return sessions.stream()
                .anyMatch(s -> s.getSessionId().equals(sessionId));
        } catch (Exception ex) {
            return false;
        }
    }

    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            String sessionId = "user-123-conversation";

            if (sessionExists(client, sessionId)) {
                System.out.println("Session exists, resuming...");
                var session = client.resumeSession(
                    sessionId,
                    new ResumeSessionConfig()
                        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                ).get();
                // ... use session ...
                session.close();
            } else {
                System.out.println("Session doesn't exist, creating new one...");
                var session = client.createSession(
                    new SessionConfig()
                        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                        .setSessionId(sessionId)
                        .setModel("gpt-5")
                ).get();
                // ... use session ...
                session.close();
            }
        }
    }
}
```

## Best practices

1. **Use meaningful session IDs**: Include user ID or context in the session ID (e.g., `"user-123-chat"`, `"task-456-review"`)
2. **Handle missing sessions**: Check if a session exists before resuming — use `listSessions()` or catch the exception from `resumeSession()`
3. **Clean up old sessions**: Periodically delete sessions that are no longer needed with `deleteSession()`
4. **Error handling**: Always wrap resume operations in try-catch blocks — sessions may have been deleted or expired
5. **Workspace awareness**: Sessions are tied to workspace paths; ensure consistency when resuming across environments
