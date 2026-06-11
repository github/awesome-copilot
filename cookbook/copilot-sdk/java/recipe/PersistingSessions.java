///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;

public class PersistingSessions {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            // Create a session with a custom ID so we can resume it later
            var session = client.createSession(
                new SessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setSessionId("user-123-conversation")
                    .setModel("gpt-5")
            ).get();

            session.on(AssistantMessageEvent.class,
                msg -> System.out.println(msg.getData().content()));

            session.sendAndWait(new MessageOptions()
                .setPrompt("Let's discuss TypeScript generics")).get();

            System.out.println("\nSession ID: " + session.getSessionId());

            // Close session but keep data on disk for later resumption
            session.close();
            System.out.println("Session closed — data persisted to disk.");
        }
    }
}
