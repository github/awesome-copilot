///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.nio.file.*;

/**
 * Simple Ralph Loop — reads PROMPT.md and runs it in a fresh session each iteration.
 *
 * Usage:
 *   jbang RalphLoop.java                  # defaults: PROMPT.md, 50 iterations
 *   jbang RalphLoop.java PROMPT.md 20     # custom prompt file, 20 iterations
 */
public class RalphLoop {
    public static void main(String[] args) throws Exception {
        String promptFile = args.length > 0 ? args[0] : "PROMPT.md";
        int maxIterations = args.length > 1 ? Integer.parseInt(args[1]) : 50;

        System.out.printf("Ralph Loop — prompt: %s, max iterations: %d%n", promptFile, maxIterations);

        try (var client = new CopilotClient()) {
            client.start().get();

            String prompt = Files.readString(Path.of(promptFile));

            for (int i = 1; i <= maxIterations; i++) {
                System.out.printf("%n=== Iteration %d/%d ===%n", i, maxIterations);

                // Fresh session each iteration — context isolation is the point
                var session = client.createSession(
                    new SessionConfig()
                        .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                        .setModel("gpt-5.1-codex-mini")
                        .setWorkingDirectory(System.getProperty("user.dir"))
                ).get();

                // Log tool usage for visibility
                session.on(ToolExecutionStartEvent.class,
                    ev -> System.out.printf("  ⚙ %s%n", ev.getData().toolName()));

                try {
                    session.sendAndWait(new MessageOptions().setPrompt(prompt)).get();
                } finally {
                    session.close();
                }

                System.out.printf("Iteration %d complete.%n", i);
            }
        }

        System.out.println("\nAll iterations complete.");
    }
}
