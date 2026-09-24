# Voice Profile

How to learn an author's voice from their own writing and apply it to a new post. The goal is a post the author would recognize as theirs: not a generic technical article, and not a caricature of their style.

## Gathering samples

Use three to five samples. Fewer than three gives a thin read, and more than five rarely adds anything.

Sources, in order of preference:

1. **Named in the request**: files, folders, URLs, or pasted text.
2. **A saved profile** the user points to, in the request or in their custom instructions. A profile summarizes earlier samples, so when fresh samples disagree with it, the samples win.
3. **Existing posts at the destination**, when it is a blog repository.

When choosing among available posts:

- **Prefer recent posts.** Voice drifts over the years, and the latest posts are the best guide.
- **Prefer posts like this one.** Technical walkthroughs over announcements, personal essays, or event recaps.
- **Use only the author's own words.** Skip guest posts, co-written posts, link roundups, generated pages such as tag indexes and archives, and posts made mostly of quoted material. On a multi-author site, filter by the author field.
- **Read the article, not the page.** For a URL, read the article text and ignore navigation, comments, and site chrome. If a page cannot be fetched, say so and ask for a file or pasted text instead.

## What to capture

Read for how things are said, not what they say. Note a pattern only when it shows up in most samples. Something that happens once is not a habit.

| Dimension | What to look for |
| --- | --- |
| Person and address | "I", "we", or neither; whether the reader is addressed as "you" |
| Formality | Contractions, slang, jargon left unexplained |
| Rhythm | Typical sentence length, fragments, rhetorical questions |
| Paragraphs | One or two sentences, or dense blocks |
| Openings | Personal story, problem statement, question, straight to code, TL;DR |
| Headings | Sentence or title case; labels, questions, or instructions; how deep they go |
| Code presentation | How code is introduced, whether it is explained before or after, inline comments, block size, whether output is shown |
| Explanation depth | Assumes expertise or explains basics; links out or explains inline |
| Humor and asides | Jokes, parentheticals, footnotes, references |
| Lists and prose | Bullet-heavy or narrative |
| Closings | Summary, next steps, a question to readers, a sign-off line, or none |
| Titles | Literal task names or playful ones |
| Length | Typical word count for a walkthrough |
| Mechanics | US or UK spelling, Oxford comma, dash and hyphen habits, emoji, exclamation marks |
| Never | Things absent from every sample, such as emoji, the word "simply", or headings below H3 |

## Summarizing the profile

At the plan check, give the author three to five bullets they can correct in seconds. For example:

- First person, talks to the reader as "you", contractions throughout.
- Opens with the problem in one or two sentences, then goes straight to code.
- Sentence-case headings phrased as tasks ("Parse the date", "Handle bad input").
- Explains code after each block, rarely with inline comments.
- Ends with a short "Wrapping up" and a link to the docs. No emoji.

A correction from the author outranks anything inferred.

## Applying the profile

- **Match patterns, not words.** Do not lift sentences from a sample. The exception is a fixed element the author repeats in every post, such as a sign-off line or standard section headings: reuse those as they are. A favorite phrase that only recurs appears no more often than in a typical post of theirs.
- **Do not exaggerate.** Amplified quirks turn a voice into a caricature. When unsure, write the plainer version.
- **Never invent experience.** A first-person claim that something happened to the author, anywhere in the post ("I got bitten by this last week", "I've been caught out by this before"), needs the author as its source. Ask at the plan check, or say it generally ("This one catches people out"). Do not make up an anecdote, a colleague, an employer, a timeline, or a result. A general observation in a lived-in tone ("Config breaks at the worst moment") is a problem statement, not a story, and matching it invents nothing.
- **Required content still wins.** The voice decides wording, order, and headings. It does not remove the code sample, the usage example, or the expected output, and it never overrides the security rules.
- **Keep the author's title pattern.** When their titles follow a clear style, keep it and fit the primary search phrase in where it reads naturally, instead of forcing the SEO pattern over it.
- **Keep sample content out.** Names, projects, links, and stories from the samples never appear in the new post.

## Checking the draft

Before showing the draft, compare it with the samples:

- Would the opening paragraph pass as the author's if placed next to their posts?
- Do person, heading case, code introductions, and the closing match the profile?
- Is any sentence lifted from a sample? Rewrite it.
- Does any first-person claim of experience lack the author as its source? Remove it, or say it generally.

## Without samples

When the user has no samples, offer three quick questions:

1. Do you write as "I", "we", or neither?
2. Casual or formal?
3. How do your posts usually open and end?

The answers form a minimal profile. Say at the plan check that it comes from answers rather than samples.

When the user declines the questions too, write in a neutral voice: second person, plain wording, short paragraphs, sentence-case headings, no humor, no emoji. Say so at the plan check, and offer to rework the draft once samples are available.

## Saving the profile

After delivery, when the profile came from samples, offer once to save it using the template at `assets/voice-profile-template.md`. The user chooses where. Suggest the blog repository when the post went there, so the profile lives next to the posts it describes.

On a later run, use the saved profile when the user points to it, either in the request or in their custom instructions. Refresh it from newer posts when the user asks, or when it no longer matches recent samples.
