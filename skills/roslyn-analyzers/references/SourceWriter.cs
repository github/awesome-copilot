// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

// Adapted from https://github.com/eiriktsarpalis/PolyType/blob/main/src/PolyType.Roslyn/SourceWriter.cs
using System;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using Microsoft.CodeAnalysis.Text;

namespace Product.Analyzers;

/// <summary>
/// A utility class for generating consistently indented source code.
/// </summary>
/// <remarks>
/// Indentation is applied automatically at the start of each non-empty line,
/// so callers should never embed leading whitespace in the text they write.
/// Use <see cref="OpenBlock"/>/<see cref="CloseBlock"/> for braced blocks
/// and <see cref="Indent"/> for indented lines that are not braced (e.g. constructor initializers).
/// </remarks>
internal sealed class SourceWriter
{
    // Fixed newlines make generated output deterministic across platforms.
    private const string NewLine = "\r\n";

    private readonly StringBuilder builder = new();
    private int indentation;
    private bool atLineStart = true;

    /// <summary>
    /// Initializes a new instance of the <see cref="SourceWriter"/> class.
    /// </summary>
    public SourceWriter()
        : this('\t', 1)
    {
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="SourceWriter"/> class.
    /// </summary>
    /// <param name="indentationChar">The whitespace character used for indentation.</param>
    /// <param name="charsPerIndentation">The number of characters in each indentation level.</param>
    public SourceWriter(char indentationChar, int charsPerIndentation)
    {
        if (!char.IsWhiteSpace(indentationChar))
        {
            throw new ArgumentOutOfRangeException(nameof(indentationChar));
        }

        if (charsPerIndentation < 1)
        {
            throw new ArgumentOutOfRangeException(nameof(charsPerIndentation));
        }

        this.IndentationChar = indentationChar;
        this.CharsPerIndentation = charsPerIndentation;
    }

    /// <summary>
    /// Gets the character used for indentation.
    /// </summary>
    public char IndentationChar { get; }

    /// <summary>
    /// Gets the number of characters per indentation level.
    /// </summary>
    public int CharsPerIndentation { get; }

    /// <summary>
    /// Gets the length of the generated source.
    /// </summary>
    public int Length => this.builder.Length;

    /// <summary>
    /// Gets or sets the current indentation level.
    /// </summary>
    /// <remarks>
    /// Prefer <see cref="OpenBlock"/>, <see cref="CloseBlock"/>, and <see cref="Indent"/>,
    /// which keep indentation balanced, over setting this property directly.
    /// </remarks>
    public int Indentation
    {
        get => this.indentation;
        set
        {
            if (value < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(value));
            }

            this.indentation = value;
        }
    }

    /// <summary>
    /// Writes a character, indenting first if it starts a line.
    /// </summary>
    /// <param name="value">The non-newline character to write. Use <see cref="WriteLine()"/> to end a line.</param>
    /// <returns>This writer, for chaining.</returns>
    /// <exception cref="ArgumentException">Thrown when <paramref name="value"/> is a carriage return or line feed.</exception>
    public SourceWriter Write(char value)
    {
        if (value is '\r' or '\n')
        {
            throw new ArgumentException("Use WriteLine() to write a newline.", nameof(value));
        }

        this.AddIndentationIfAtLineStart();
        this.builder.Append(value);
        return this;
    }

    /// <summary>
    /// Writes text without ending the line, indenting first if it starts a line.
    /// </summary>
    /// <param name="text">The C# source to write. Embedded CR, LF, and CRLF newlines start new, indented lines and are normalized to CRLF.</param>
    /// <returns>This writer, for chaining.</returns>
    /// <remarks>
    /// Use this to build a line from several fragments, such as a member signature assembled in a loop.
    /// </remarks>
    public SourceWriter Write([StringSyntax("c#-test")] string text)
    {
        this.WriteLines(text, disableIndentation: false, endWithNewLine: false);
        return this;
    }

    /// <summary>
    /// Writes a character followed by a newline.
    /// </summary>
    /// <param name="value">The non-newline character to write. Use <see cref="WriteLine()"/> to write an empty line.</param>
    /// <returns>This writer, for chaining.</returns>
    /// <exception cref="ArgumentException">Thrown when <paramref name="value"/> is a carriage return or line feed.</exception>
    public SourceWriter WriteLine(char value) => this.Write(value).WriteLine();

    /// <summary>
    /// Writes text followed by a newline.
    /// </summary>
    /// <param name="text">The C# source to write. Each embedded line is indented, and CR, LF, and CRLF newlines are normalized to CRLF.</param>
    /// <param name="disableIndentation">Whether to suppress current indentation.</param>
    /// <returns>This writer, for chaining.</returns>
    public SourceWriter WriteLine(
        [StringSyntax("c#-test")] string text,
        bool disableIndentation = false)
    {
        this.WriteLines(text, disableIndentation, endWithNewLine: true);
        return this;
    }

    /// <summary>
    /// Writes a newline.
    /// </summary>
    /// <returns>This writer, for chaining.</returns>
    public SourceWriter WriteLine()
    {
        this.builder.Append(NewLine);
        this.atLineStart = true;
        return this;
    }

    /// <summary>
    /// Writes an opening brace on its own line and increases the indentation.
    /// </summary>
    /// <returns>This writer, for chaining.</returns>
    /// <remarks>
    /// When called mid-line, the line is ended first, so <c>Write("class C").OpenBlock()</c> produces a brace on the next line.
    /// </remarks>
    public SourceWriter OpenBlock()
    {
        if (!this.atLineStart)
        {
            this.WriteLine();
        }

        this.WriteLine('{');
        this.indentation++;
        return this;
    }

    /// <summary>
    /// Decreases the indentation and writes a closing brace on its own line.
    /// </summary>
    /// <param name="suffix">Text to write after the brace, such as <c>";"</c> or <c>")"</c>.</param>
    /// <returns>This writer, for chaining.</returns>
    /// <exception cref="InvalidOperationException">Thrown when no indentation level is open.</exception>
    public SourceWriter CloseBlock(string suffix = "")
    {
        if (this.indentation == 0)
        {
            throw new InvalidOperationException("No open block is available to close.");
        }

        if (!this.atLineStart)
        {
            this.WriteLine();
        }

        this.indentation--;
        return this.Write('}').WriteLine(suffix);
    }

    /// <summary>
    /// Increases the indentation until the returned value is disposed.
    /// </summary>
    /// <returns>A value that restores the previous indentation when disposed.</returns>
    /// <example>
    /// <code>
    /// writer.WriteLine("public C()");
    /// using (writer.Indent())
    /// {
    ///     writer.WriteLine(": base(1)");
    /// }
    /// </code>
    /// </example>
    public IndentationScope Indent()
    {
        this.indentation++;
        return new IndentationScope(this, this.indentation);
    }

    /// <summary>
    /// Returns the generated source text.
    /// </summary>
    /// <returns>The generated source.</returns>
    public SourceText ToSourceText()
    {
        if (this.builder.Length == 0)
        {
            throw new InvalidOperationException("Nothing was written.");
        }

        if (this.indentation != 0)
        {
            throw new InvalidOperationException($"Indentation level expected to be 0 but is {this.indentation}.");
        }

        return SourceText.From(this.builder.ToString(), Encoding.UTF8);
    }

    private static ReadOnlySpan<char> GetNextLine(ref ReadOnlySpan<char> remainingText, out bool isFinalLine)
    {
        if (remainingText.IsEmpty)
        {
            isFinalLine = true;
            return default;
        }

        int lineLength = remainingText.IndexOfAny('\r', '\n');
        ReadOnlySpan<char> rest;
        if (lineLength == -1)
        {
            lineLength = remainingText.Length;
            isFinalLine = true;
            rest = default;
        }
        else
        {
            int newlineLength = remainingText[lineLength] == '\r' &&
                lineLength + 1 < remainingText.Length &&
                remainingText[lineLength + 1] == '\n' ? 2 : 1;
            rest = remainingText[(lineLength + newlineLength)..];
            isFinalLine = false;
        }

        ReadOnlySpan<char> next = remainingText[..lineLength];
        remainingText = rest;
        return next;
    }

    private void WriteLines(string text, bool disableIndentation, bool endWithNewLine)
    {
        bool isFinalLine;
        ReadOnlySpan<char> remainingText = text.AsSpan();
        do
        {
            ReadOnlySpan<char> nextLine = GetNextLine(ref remainingText, out isFinalLine);

            // Empty lines get no indentation, so the output has no trailing whitespace.
            if (!nextLine.IsEmpty)
            {
                if (disableIndentation)
                {
                    this.atLineStart = false;
                }
                else
                {
                    this.AddIndentationIfAtLineStart();
                }

                this.AppendSpan(nextLine);
            }

            if (!isFinalLine || endWithNewLine)
            {
                this.WriteLine();
            }
        }
        while (!isFinalLine);
    }

    private void AddIndentationIfAtLineStart()
    {
        if (this.atLineStart)
        {
            this.builder.Append(this.IndentationChar, this.CharsPerIndentation * this.indentation);
            this.atLineStart = false;
        }
    }

    private void AppendSpan(ReadOnlySpan<char> span)
        => this.builder.Append(span.ToString());

    /// <summary>
    /// Restores a <see cref="SourceWriter"/> to its previous indentation when disposed.
    /// </summary>
    internal readonly struct IndentationScope : IDisposable
    {
        private readonly SourceWriter writer;
        private readonly int expectedIndentation;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndentationScope"/> struct.
        /// </summary>
        /// <param name="writer">The writer whose indentation to restore.</param>
        /// <param name="expectedIndentation">The indentation level this scope established.</param>
        internal IndentationScope(SourceWriter writer, int expectedIndentation)
        {
            this.writer = writer;
            this.expectedIndentation = expectedIndentation;
        }

        /// <summary>
        /// Decreases the writer's indentation by one level.
        /// </summary>
        /// <exception cref="InvalidOperationException">Thrown when blocks opened inside the scope were not closed.</exception>
        public void Dispose()
        {
            if (this.writer is null)
            {
                return;
            }

            if (this.writer.indentation != this.expectedIndentation)
            {
                throw new InvalidOperationException($"Indentation level expected to be {this.expectedIndentation} but is {this.writer.indentation}. Close inner blocks before disposing the indentation scope.");
            }

            this.writer.indentation--;
        }
    }
}
