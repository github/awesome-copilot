# bolt-java

## purpose

Slack Bolt for Java SDK patterns — app initialization, listener registration, context objects, and Web API usage for Tier 3 Java projects.

## rules

1. Add the `com.slack.api:bolt` dependency (and optionally `bolt-servlet`, `bolt-jetty`, or `bolt-socket-mode`) via Maven or Gradle. The SDK is modular: `slack-api-client` for Web API, `slack-api-model` for data models, `bolt` for the app framework. [github.com/slackapi/java-slack-sdk](https://github.com/slackapi/java-slack-sdk)
2. Initialize the App with `new App()` (reads `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET` from env) or with `new App(AppConfig.builder().singleTeamBotToken(token).signingSecret(secret).build())`. The `AppConfig` uses Lombok `@Builder` for fluent configuration. [github.com/slackapi/java-slack-sdk/wiki](https://github.com/slackapi/java-slack-sdk/wiki)
3. Register listeners using lambda syntax: `app.command("/cmd", (req, ctx) -> ctx.ack())`. All handlers receive two parameters — a typed `Request` and a typed `Context`. The handler returns a `Response` object. This replaces the TS single-context-object pattern. [github.com/slackapi/java-slack-sdk/wiki](https://github.com/slackapi/java-slack-sdk/wiki)
4. All listeners support string or `Pattern` (regex) matching: `app.command("/hello", handler)` for exact match, `app.command(Pattern.compile("^/hello.*"), handler)` for regex. Message listeners do substring matching by default: `app.message("hello", handler)` matches any message containing "hello". [java-slack-sdk source: App.java]
5. Always return `ctx.ack()` from handlers — Java Bolt uses return values, not void handlers. Return `ctx.ack()`, `ctx.ack("text")`, `ctx.ack(blocks)`, or for views: `ctx.ackWithErrors(errorMap)`, `ctx.ackWithUpdate(view)`, `ctx.ackWithPush(view)`. [java-slack-sdk source: Context.java]
6. Access the Web API client via `ctx.client()`. Method names match the Slack API but use **camelCase**: `ctx.client().chatPostMessage(r -> r.channel(ch).text(msg))`. All methods use a **request configurator lambda** (`r -> r.field(value)`), not positional arguments. [java-slack-sdk source: MethodsClient]
7. Use the **static import helpers** for Block Kit: `import static com.slack.api.model.block.Blocks.*`, `import static com.slack.api.model.block.element.BlockElements.*`, `import static com.slack.api.model.block.composition.BlockCompositions.*`. Build blocks with `asBlocks(section(...), divider(), actions(...))`. [java-slack-sdk source: Blocks.java]
8. Build modal views with `View.builder().type("modal").callbackId("id").title(viewTitle(t -> t.text("Title"))).blocks(blocks).submit(viewSubmit(s -> s.text("Submit"))).build()`. Open with `ctx.client().viewsOpen(r -> r.triggerId(ctx.getTriggerId()).view(view))`. [java-slack-sdk source: View.java]
9. For Socket Mode, use `SocketModeApp` from `bolt-socket-mode`: `new SocketModeApp(appToken, app).start()`. The `SLACK_APP_TOKEN` env var is auto-loaded if not passed explicitly. [java-slack-sdk source: SocketModeApp.java]
10. For Spring Boot, extend `SlackAppServlet` from `bolt-jakarta-servlet` and annotate with `@WebServlet("/slack/events")`. Register the `App` as a Spring `@Bean`. [java-slack-sdk bolt-spring-boot-examples]
11. For OAuth multi-workspace apps, configure `AppConfig.builder().clientId(...).clientSecret(...).scope("chat:write,commands")` and call `app.asOAuthApp(true)`. Implement `InstallationService` for custom token storage. The built-in `FileInstallationService` stores tokens on disk. [java-slack-sdk source: InstallationService.java]
12. Use `app.executorService().submit(() -> { ... })` for async background work after ack. Java Bolt handlers are synchronous — ack first within 3 seconds, then submit long-running work to the executor. [java-slack-sdk source: App.java]

## patterns

### Slash command that opens a modal

```java
import com.slack.api.bolt.App;
import com.slack.api.bolt.AppConfig;
import com.slack.api.model.view.View;
import static com.slack.api.model.block.Blocks.*;
import static com.slack.api.model.block.element.BlockElements.*;
import static com.slack.api.model.block.composition.BlockCompositions.*;
import static com.slack.api.model.view.Views.*;

App app = new App(AppConfig.builder()
    .singleTeamBotToken(System.getenv("SLACK_BOT_TOKEN"))
    .signingSecret(System.getenv("SLACK_SIGNING_SECRET"))
    .build());

app.command("/task", (req, ctx) -> {
    ctx.client().viewsOpen(r -> r
        .triggerId(ctx.getTriggerId())
        .view(View.builder()
            .type("modal")
            .callbackId("task_modal")
            .title(viewTitle(t -> t.text("Create Task")))
            .submit(viewSubmit(s -> s.text("Create")))
            .blocks(asBlocks(
                input(i -> i
                    .blockId("title_block")
                    .label(plainText("Title"))
                    .element(plainTextInput(pti -> pti
                        .actionId("title_input")))
                )
            ))
            .build()
        )
    );
    return ctx.ack();
});

app.viewSubmission("task_modal", (req, ctx) -> {
    var values = req.getPayload().getView().getState().getValues();
    var titleMap = values.get("title_block");
    var title = titleMap.get("title_input").getValue();

    if (title == null || title.length() < 3) {
        return ctx.ackWithErrors(Map.of("title_block", "Title too short"));
    }
    return ctx.ack();
});
```

### Event handler with proactive message

```java
import com.slack.api.model.event.AppMentionEvent;

app.event(AppMentionEvent.class, (req, ctx) -> {
    var event = req.getEvent();
    ctx.client().chatPostMessage(r -> r
        .channel(event.getChannel())
        .threadTs(event.getTs())
        .text("Thanks for the mention, <@" + event.getUser() + ">!")
    );
    return ctx.ack();
});
```

### Socket Mode with Spring Boot

```java
import com.slack.api.bolt.App;
import com.slack.api.bolt.socket_mode.SocketModeApp;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SlackConfig {
    @Bean
    public App slackApp() {
        App app = new App();
        app.command("/ping", (req, ctx) -> ctx.ack("pong!"));
        app.message("hello", (req, ctx) -> {
            ctx.say("Hey there!");
            return ctx.ack();
        });
        return app;
    }

    @Bean
    public SocketModeApp socketModeApp(App app) throws Exception {
        var socketApp = new SocketModeApp(
            System.getenv("SLACK_APP_TOKEN"), app
        );
        socketApp.startAsync();
        return socketApp;
    }
}
```

## pitfalls

- **Returning `null` vs `ctx.ack()`**: Java handlers must return a `Response`. Returning `null` skips the response — the user sees a timeout error. Always return `ctx.ack()`.
- **Request configurator pattern**: All API methods use `r -> r.field(value)` lambdas, not method arguments. Writing `chatPostMessage(channel, text)` won't compile.
- **Static import confusion**: Block Kit builders require static imports from three separate classes (`Blocks`, `BlockElements`, `BlockCompositions`). Missing any causes compilation errors on helper methods like `section()`, `plainText()`, `asBlocks()`.
- **No Teams SDK for Java**: Bot Framework Java was archived at end of 2025 with no replacement. For the Teams side in Tier 3 Java projects, use REST API patterns from `experts/bridge/rest-only-integration-ts.md`.
- **Async work after ack**: Java handlers are synchronous. For work taking >3 seconds, call `ctx.ack()` first, then submit work to `app.executorService()`. Do not block the handler thread.

## references

- https://github.com/slackapi/java-slack-sdk
- https://github.com/slackapi/java-slack-sdk/wiki
- https://slack.dev/java-slack-sdk/guides/bolt-basics

## instructions

This expert covers Slack Bolt for Java — the Java equivalent of `@slack/bolt`. Use it for Tier 3 Java projects that need Slack SDK patterns. Java projects have SDK support for Slack but not Teams. For the Teams side, pair with `experts/bridge/rest-only-integration-ts.md` to implement REST-based Teams integration.

Pair with: `bridge/rest-only-integration-ts.md` for REST-based Teams integration (the unsupported side). TS Bolt experts for conceptual architecture reference.

## research

Deep Research prompt:

"Write a micro expert on Slack Bolt for Java. Cover App/AppConfig initialization (builder pattern, env vars), listener registration (lambda syntax, request + context params, string/Pattern matching), Context subclasses (SlashCommandContext, ActionContext, EventContext, ViewSubmissionContext), Response return pattern (ack, ackWithErrors, ackWithUpdate), MethodsClient API calls (request configurator lambdas, camelCase methods), Block Kit builders (static imports from Blocks/BlockElements/BlockCompositions), View builder, Socket Mode (SocketModeApp), Spring Boot integration (SlackAppServlet, @Bean), OAuth (InstallationService, AppConfig OAuth fields), and executor for async work. Source from java-slack-sdk source code."
