///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:0.2.1-java.1

import com.github.copilot.sdk.*;
import com.github.copilot.sdk.events.*;
import com.github.copilot.sdk.json.*;
import java.util.concurrent.ExecutionException;

public class ErrorHandling {
    public static void main(String[] args) {
        try (var client = new CopilotClient()) {
            client.start().get();

            var session = client.createSession(
                new SessionConfig()
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL)
                    .setModel("gpt-5")).get();

            session.on(AssistantMessageEvent.class,
                msg -> System.out.println(msg.getData().content()));

            session.sendAndWait(
                new MessageOptions().setPrompt("Hello!")).get();

            session.close();
        } catch (ExecutionException ex) {
            System.err.println("Error: " + ex.getCause().getMessage());
            ex.getCause().printStackTrace();
        } catch (Exception ex) {
            System.err.println("Error: " + ex.getMessage());
            ex.printStackTrace();
        }
    }
}
