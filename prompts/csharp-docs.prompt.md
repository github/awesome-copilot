---
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'problems']
description: 'Ensure that C# types are documented with XML comments and follow best practices for documentation.'
---

# C# Documentation Best Practices

- Public members should be documented with XML comments.
- It is encouraged to document internal members as well, especially if they are complex or not self-explanatory.
- Use `<summary>` for method descriptions. This should be a brief overview of what the method does.
- Use `<param>` for method parameters.
- Use `<returns>` for method return values.
- Use `<remarks>` for additional information, which can include implementation details, usage notes, or any other relevant context.
- Use `<example>` for usage examples on how to use the member.
- Use `<exception>` to document exceptions thrown by methods.
- Use `<see>` and `<seealso>` for references to other types or members.
- Use `<inheritdoc/>` to inherit documentation from base classes or interfaces.
  - Unless there is major behavior change, in which case you should document the differences.
- Use `<typeparam>` for type parameters in generic types or methods.
- Use `<typeparamref>` to reference type parameters in documentation.
- Use `<c>` for inline code snippets.
- Use `<code>` for code blocks.
- Use `<see langword>` for language specific keywords like `null`, `true`, `false`, `int`, `bool`, etc.
