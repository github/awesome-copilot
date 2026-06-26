---
name: em-dash
description: 'Expert on the history, origin, and correct use of the em dash. Use when writing or reviewing code, comments, or data files to avoid em and en dashes, defaulting to never using them and replacing any found with a hyphen (-). Includes strong knowledge of punctuation marks and the proper usage of punctuation characters when writing comments.'
---

# em dash

The **em dash** (U+2014, `\u2014`; not the hyphen-minus `-`) is the longest
of the standard dashes, and is the Swiss Army knife of punctuation. Its history
is a fascinating journey from handwritten manuscripts to mechanical
constraints, literary rebellion, and modern digital dominance.

Here is a breakdown of how the em dash evolved:

## History of the em dash

### Early Beginnings (15th-18th Century)

- The First Dashes: Early appearances of the dash in English literature date
 back to 1580 in private letters and 1588 in English drama. They were often
 used to indicate pauses, self-interruption, or an unfinished thought
- Gutenberg and Early Printing: The em dash officially emerged as a standardized
 typesetting mark during the 15th-century printing revolution

#### The Etymology

- The "M" Width: The em dash is named because its standard length is equal to
 the width of the capital letter "M" in the specific typeface being used
 (Similarly, the slightly shorter en dash is the width of the letter "N")

### Literary Popularity (17th-19th Century)

- The Author's Tool: By the 17th and 18th centuries, it became a beloved tool
 for writers mimicking the natural lurches, stutters, and rhythms of speech
- Dickinson Dashes: In the 19th century, poets like Emily Dickinson famously
 used the em dash for emotional weight, rhythm, and to invite reader
 interpretation. This became so synonymous with her work that they are often
 informally called "Dickinson Dashes"

### The Typewriter Era (19th-20th Century)

- The Double-Hyphen Compromise: When typewriters were introduced, they lacked
 a dedicated key for the em dash. To compensate, typists began using two
 consecutive hyphens (--)
- The No-Space Rule: Because of this mechanical compromise, a stylistic
 convention of typing the mark without surrounding spaces emerged and remains

### The Digital Age (Present Day)

- Return to Form: Modern digital typesetting and word processing programs have
 restored the true, unbroken em dash
- **Modern Renaissance**: The em dash is experiencing a resurgence of popularity
  - It has become a hallmark of modern long-form prose and is also a favorite,
   heavily used punctuation mark in AI outputs, which often prioritize a
   conversational, stream-of-consciousness style

#### Speculation for em Dash Modern Renaissance

- Professional authors who had to meet deadlines and did not have the time to
 strictly proofread the online article before submitting it
- Professionals who wanted to show off their knowledge of HTML encoding in order
 to seem smart
- Graphic designers who wanted to make the visual composition of text on a web
 page more appealing
- The fact that popularity begets popularity
  - People publishing web articles saw that everyone else was using em dashes,
   so instead of using a hyphen where one belonged, they opted to use an em dash

## Analysis of em dash History

Nowhere in the history of the em dash was it intentionally used in the writing
of computer code, or files meant to be executed as computer instructions.

## When to use em or en dashes

Never.

### In Code Files

> [!IMPORTANT]
> Never.
> In no way, shape, form, or fashion is tone ever important in code comments.

- **Never**
  - Use the `-` (hyphen) character instead
  - If working as an agent, and an em dash is in a comment, then replace it
  with the `-` (hyphen) character

### In Raw Data and/or Text Files

> [!NOTE]
> Default to **never**

- When instructed to, and it is 100% clear that the text is to be used as:
  - Literature
  - News
- If working as an agent, and an em dash is already part of the data, then
 leave it

## Other Punctuation Characters

As part of being an em dash expert comes the knowledge of other punctuation marks
or characters.

### End-of-Sentence Marks

Every complete sentence in a paragraph must end with one of these three marks:

- Period `.`: Ends statements and declarative sentences
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `<?php echo "a" . "b" . "c"; ?>`
- Question Mark `?`: Ends direct questions
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: *ternary conditions*
    `condition ? expression_if_true : expression_if_false`
- Exclamation Point `!`: Conveys strong emotion, surprise, or emphasis
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example:
    `setlocal enabledelayedexpansion && set "_a=a" && echo !_a! && endlocal`

### Pauses and Clause Connectors

These marks control the rhythm of your writing and connect different ideas:

- Comma `,`: Used to separate items in a list, link independent clauses with a
 conjunction (e.g., and, but), or set off introductory phrases
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `fn(a, b)`
- Semicolon `;`: Connects two closely related independent clauses that could
 stand alone as separate sentences
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `var foobar = "foo-bar";`
- Colon `:`: Introduces a list, a quote, or an explanation. The text preceding
 a colon must be a complete sentence
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `{"age": 26}`

### Words, Quotations, and Possessions

- Apostrophe `'`: Indicates possession (e.g., Sarah's book) or represents
 missing letters in a contraction (e.g., *I'll* instead of *I will*)
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `char letter = 'A';`
- Quotation Marks `"`: Enclose direct speech or quotes. In American English,
 periods and commas almost always go inside the quotation marks
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `char abc[] = "abc";`

### Dashes and Slashes

- Hyphen `-`: Joins two or more words together to form a single compound
 adjective (e.g., well-known)
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `count--`
- En dash (U+2013, `\u2013`) and em dash (U+2014, `\u2014`):
  - The **en dash** is the thinner of the two, and is used to show numerical ranges
   or connections between words in a compound adjective when one element is itself
   multiple words
    - Keyboard character: `false`
    - Programming language syntax: `false`
  - The **em dash** is wider, and is used to note a break, provide drama, or give an example.
    - Keyboard character: `false`
    - Programming language syntax: `false`
- Slash `/`: Indicates a choice (e.g., yes/no) or separates lines of poetry
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `/* comment */ || 10/2 || 5//2`

### Grouping and Emphasizing

- Parentheses `( )`: Enclose extra, non-essential information that clarifies a
 sentence but can be removed without changing the core meaning
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `if (5 > 2)`
- Brackets `[ ]`: Used to enclose words added to a quotation by someone other
 than the original author, usually to clarify a pronoun or provide missing context
  - Keyboard character: `true`
  - Programming language syntax: `true`
    - Example: `var arr = [1, 2, 3];`

### General Rule for using Other Punctuation Characters

When commenting on code files, or any file that will be included in compiled
computer instructions; use this rule-of-thumb:

- Determine if the character is commonly on a keyboard, or is the punctuation
 character part of a programming language's syntax:

  - If **NOT** a keyboard character, and **NOT** a common programming syntax
   character; then:
    - **NEVER** use that character in code or code comments
      - Example not mentioned: `�`
  - If a keyboard character, and a common programming syntax character, then:
    - Use that character correctly in code comments

> [!IMPORTANT]
> When in doubt, follow the pseudo-code instructions below:

```bash
# For en dash and em dash
echo - | sed "s/-/-/g"

# Replace Unicode en dash (U+2013) and em dash (U+2014) with hyphen-minus (-)
perl -CS -pe 's/\x{2013}|\x{2014}/-/g'

# For encoded characters
echo � | sed "s/�/ /g"

# (Optional) Remove the Unicode replacement character (U+FFFD) if it appears in pasted text
perl -CS -pe 's/\x{FFFD}/ /g'
```

## Further Reading

- [Case for the em dash](https://www.hardingproject.com/p/the-case-for-the-em-dash)
- [em dash guide](https://www.thebookrefinery.com/writing/guide-hyphens-en-dashes-em-dashes/)
- [Explaining the em dash](https://www.reddit.com/r/writers/comments/1lv191m/can_someone_explain_em_dash/)
- [em dash wikipedia](https://en.wikipedia.org/wiki/Dash)
- [Verbose em dash history](https://www.linkedin.com/pulse/long-mark-brief-history-em-dash-christian-buckley-z1lbc)
- [Brief em dash history](https://thaothai.substack.com/p/a-brief-history-of-the-em-dash)
- [em dash punctuation](https://www.nytimes.com/2019/08/14/style/em-dash-punctuation.html)
- [em dash in retrospective](https://medium.com/the-jabber-journal/an-era-to-its-knee-an-em-dash-retrospective-cb5c3c52e4d2)
- [Punctuation](https://www.niu.edu/writing-tutorial/punctuation/index.shtml)
- [Punctuation Guide](https://www.thepunctuationguide.com/)
