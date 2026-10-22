///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:1.0.21

import com.github.copilot.*;
import com.github.copilot.rpc.*;
import java.util.concurrent.CompletableFuture;

public class MultipleSessions {
    public static void main(String[] args) throws Exception {
        try (var client = new CopilotClient()) {
            client.start().get();

            var config = new SessionConfig()
                .setModel("gpt-5")
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL);

            // Create 3 sessions in parallel
            var f1 = client.createSession(config);
            var f2 = client.createSession(config);
            var f3 = client.createSession(new SessionConfig()
                .setModel("claude-sonnet-4.5")
                .setOnPermissionRequest(PermissionHandler.APPROVE_ALL));
            CompletableFuture.allOf(f1, f2, f3).get();

            var s1 = f1.get(); var s2 = f2.get(); var s3 = f3.get();

            // Send a message to each session
            System.out.println("S1: " + s1.sendAndWait(new MessageOptions().setPrompt("Explain Java records")).get().getData().content());
            System.out.println("S2: " + s2.sendAndWait(new MessageOptions().setPrompt("Explain sealed classes")).get().getData().content());
            System.out.println("S3: " + s3.sendAndWait(new MessageOptions().setPrompt("Explain pattern matching")).get().getData().content());

            // Clean up
            s1.close(); s2.close(); s3.close();
        }
    }
}
