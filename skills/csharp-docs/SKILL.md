---
name: csharp-docs
description: 'Ensure that C# types are documented with XML comments and follow best practices for documentation.'
---

# C# Documentation Best Practices

- Public members should be documented with XML comments.
- It is encouraged to document internal members as well, especially if they are complex or not self-explanatory.

## Guidance for all APIs

- Use `<summary>` to provide a brief, one sentence, description of what the type or member does. Start the summary with a present-tense, third-person verb.
- Use `<remarks>` for additional information, which can include implementation details, usage notes, or any other relevant context.
- Use `<see langword>` for language-specific keywords like `null`, `true`, `false`, `int`, `bool`, etc.
- Use `<c>` for inline code snippets.
- Use `<example>` for usage examples on how to use the member.
  - Use `<code>` for code blocks. `<code>` tags should be placed within an `<example>` tag. Add the language of the code example using the `language` attribute, for example, `<code language="csharp">`.
- Use `<see cref>` to reference other types or members inline (in a sentence).
- Use `<seealso>` for standalone (not in a sentence) references to other types or members in the "See also" section of the online docs.
- Use `<inheritdoc/>` to inherit documentation from base classes or interfaces.
  - Unless there is major behavior change, in which case you should document the differences.

## Methods

- Use `<param>` to describe method parameters.
  - The description should be a noun phrase that doesn't specify the data type.
  - Begin with an introductory article.
  - If the parameter is a flag enum, start the description with "A bitwise combination of the enumeration values that specifies...".
  - If the parameter is a non-flag enum, start the description with "One of the enumeration values that specifies...".
  - If the parameter is a Boolean, the wording should be of the form "`<see langword="true" />` to ...; otherwise, `<see langword="false" />`.".
  - If the parameter is an "out" parameter, the wording should be of the form "When this method returns, contains .... This parameter is treated as uninitialized.".
- Use `<paramref>` to reference parameter names in documentation.
- Use `<typeparam>` to describe type parameters in generic types or methods.
- Use `<typeparamref>` to reference type parameters in documentation.
- Use `<returns>` to describe what the method returns.
  - The description should be a noun phrase that doesn't specify the data type.
  - Begin with an introductory article.
  - If the return type is Boolean, the wording should be of the form "`<see langword="true" />` if ...; otherwise, `<see langword="false" />`.".

## Constructors

- The summary wording should be "Initializes a new instance of the <Class> class [or struct].".

## Properties

- The `<summary>` should start with:
  - "Gets or sets..." for a read-write property.
  - "Gets..." for a read-only property.
  - "Gets [or sets] a value that indicates whether..." for properties that return a Boolean value.
- Use `<value>` to describe the value of the property.
  - The description should be a noun phrase that doesn't specify the data type.
  - If the property has a default value, add it in a separate sentence, for example, "The default is `<see langword="false" />`".
  - If the value type is Boolean, the wording should be of the form "`<see langword="true" />` if ...; otherwise, `<see langword="false" />`. The default is ...".

## Exceptions

- Use `<exception cref>` to document exceptions thrown by constructors, properties, indexers, methods, operators, and events.
- Document all exceptions thrown directly by the member.
- For exceptions thrown by nested members, document only the exceptions users are most likely to encounter.
- The description of the exception describes the condition under which it's thrown.
  - Omit "Thrown if ..." or "If ..." at the beginning of the sentence. Just state the condition directly, for example "An error occurred when accessing a Message Queuing API."
