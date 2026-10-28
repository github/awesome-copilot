///usr/bin/env jbang "$0" "$@" ; exit $?
//DEPS com.github:copilot-sdk-java:1.0.21
//DEPS net.java.dev.jna:jna:5.19.1
//JAVA_OPTIONS --enable-native-access=ALL-UNNAMED

import com.github.copilot.AllowCopilotExperimental;
import com.github.copilot.CopilotClient;
import com.github.copilot.rpc.CopilotClientOptions;
import com.github.copilot.rpc.MessageOptions;
import com.github.copilot.rpc.PermissionHandler;
import com.github.copilot.rpc.RuntimeConnection;
import com.github.copilot.rpc.SessionConfig;
import java.util.concurrent.TimeUnit;

@AllowCopilotExperimental
public class InProcessRuntime {
    public static void main(String[] args) throws Exception {
        if (args.length > 1 || (args.length == 1 && !args[0].equals("--ping"))) {
            throw new IllegalArgumentException("Usage: InProcessRuntime.java [--ping]");
        }

        var options = new CopilotClientOptions()
            .setConnection(RuntimeConnection.forInProcess());

        try (var client = new CopilotClient(options)) {
            client.start().get(30, TimeUnit.SECONDS);

            if (args.length == 1) {
                var response = client.ping("in-process recipe").get(30, TimeUnit.SECONDS);
                System.out.println(response.message());
                client.stop().get(30, TimeUnit.SECONDS);
                return;
            }

            try (var session = client.createSession(new SessionConfig()
                    .setModel("auto")
                    .setOnPermissionRequest(PermissionHandler.APPROVE_ALL))
                    .get(30, TimeUnit.SECONDS)) {
                var response = session.sendAndWait(new MessageOptions()
                        .setPrompt("Hello from the in-process runtime!"))
                    .get(60, TimeUnit.SECONDS);
                System.out.println(response.getData().content());
            }

            client.stop().get(30, TimeUnit.SECONDS);
        }
    }
}
