# Error Analysis: Multi-Turn Conversations

Debugging complex multi-turn conversation traces.

## The Approach

1. **End-to-end first** - Did the conversation achieve the goal?
2. **Find first failure** - Trace backwards to root cause
3. **Simplify** - Try single-turn before multi-turn debug
4. **N-1 testing** - Isolate turn-specific vs capability issues

## Find First Upstream Failure

```
Turn 1: User asks about flights ✓
Turn 2: Assistant asks for dates ✓
Turn 3: User provides dates ✓
Turn 4: Assistant searches WRONG dates ← FIRST FAILURE
Turn 5: Shows wrong flights (consequence)
Turn 6: User frustrated (consequence)
```

Focus on Turn 4, not Turn 6.

## Simplify First

Before debugging multi-turn, test single-turn:

```python
# If single-turn also fails → problem is retrieval/knowledge
# If single-turn passes → problem is conversation context
response = chat("What's the return policy for electronics?")
```

## N-1 Testing

Give turns 1 to N-1 as context, test turn N:

```python
context = conversation[:n-1]
response = chat_with_context(context, user_message_n)
# Compare to actual turn N
```

This isolates whether error is from context or underlying capability.

## Checklist

1. Did conversation achieve goal? (E2E)
2. Which turn first went wrong?
3. Can you reproduce with single-turn?
4. Is error from context or capability? (N-1 test)
