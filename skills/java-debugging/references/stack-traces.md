# Reading Java stack traces

## Anatomy

```
java.lang.IllegalStateException: Order 42 already shipped
	at com.example.OrderService.ship(OrderService.java:88)
	at com.example.OrderController.ship(OrderController.java:31)
	...
Caused by: java.sql.SQLException: Connection refused
	at ...
	... 12 more
```

- First line: exception type and message. Read the message literally.
- Top frame is where it was thrown; walk down to the first frame in your own code.
- `Caused by:` chains: the deepest (last) cause is usually the root cause. `... N more` means frames shared with the enclosing trace.
- `Suppressed:` entries come from try-with-resources close failures.

## Practical tips

1. Open the first frame in your own packages and check which reference could be null or which argument is invalid.
2. `NullPointerException`: helpful messages (on by default since JDK 15) name the null variable or call.
3. Wrapper exceptions (`BeanCreationException`, `CompletionException`, `InvocationTargetException`, `ExecutionException`): skip to the deepest `Caused by`.
4. `OutOfMemoryError`: use the `java-diagnostics` skill. `StackOverflowError`: look for the repeating frame pattern (unbounded recursion).
5. Missing traces on hot repeated exceptions come from `OmitStackTraceInFastThrow`; check earlier log occurrences or run locally with `-XX:-OmitStackTraceInFastThrow`.
6. Proxy/generated frames (`$$SpringCGLIB$$`, `$Proxy`, lambdas) are noise; focus on neighbouring frames.
7. Reactive/async: the trace points to scheduler threads; use correlation IDs or operator debug in dev.
8. Include the full trace, Java version, and dependency versions when asking for help or filing issues.
