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
internal sealed class SourceWriter
{
    // Fixed newlines make generated output deterministic across platforms.
    private const string NewLine = "\r\n";

    private readonly StringBuilder builder = new();
    private int indentation;

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
    /// Writes a character followed by a newline.
    /// </summary>
    /// <param name="value">The character to write.</param>
    public void WriteLine(char value)
    {
        this.AddIndentation();
        this.builder.Append(value);
        this.builder.Append(NewLine);
    }

    /// <summary>
    /// Writes text followed by a newline.
    /// </summary>
    /// <param name="text">The C# source to write.</param>
    /// <param name="disableIndentation">Whether to suppress current indentation.</param>
    public void WriteLine(
        [StringSyntax("c#-test")] string text,
        bool disableIndentation = false)
    {
        bool isFinalLine;
        ReadOnlySpan<char> remainingText = text.AsSpan();
        do
        {
            ReadOnlySpan<char> nextLine = GetNextLine(ref remainingText, out isFinalLine);
            if (!disableIndentation && this.indentation > 0)
            {
                this.AddIndentation();
            }

            this.AppendSpan(nextLine);
            this.builder.Append(NewLine);
        }
        while (!isFinalLine);
    }

    /// <summary>
    /// Writes a newline.
    /// </summary>
    public void WriteLine() => this.builder.Append(NewLine);

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

        int lineLength = remainingText.IndexOf('\n');
        ReadOnlySpan<char> rest;
        if (lineLength == -1)
        {
            lineLength = remainingText.Length;
            isFinalLine = true;
            rest = default;
        }
        else
        {
            rest = remainingText[(lineLength + 1)..];
            isFinalLine = false;
        }

        if ((uint)lineLength > 0 && remainingText[lineLength - 1] == '\r')
        {
            lineLength--;
        }

        ReadOnlySpan<char> next = remainingText[..lineLength];
        remainingText = rest;
        return next;
    }

    private void AddIndentation()
        => this.builder.Append(this.IndentationChar, this.CharsPerIndentation * this.indentation);

    private void AppendSpan(ReadOnlySpan<char> span)
        => this.builder.Append(span.ToString());
}
