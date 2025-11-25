The following instructions are only to be applied when performing a code review.

## README updates

- [ ] The new file should be added to the `README.md`.

## Prompt file guide

**Only apply to files that end in `.prompt.md`**

- [ ] The prompt has markdown front matter.
- [ ] The prompt has a `mode` field specified of either `agent` or `ask`.
- [ ] The prompt has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The `description` field value is wrapped in single quotes.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] Encourage the use of `tools`, but it's not required.
- [ ] Strongly encourage the use of `model` to specify the model that the prompt is optimised for.

## Instruction file guide

**Only apply to files that end in `.instructions.md`**

- [ ] The instruction has markdown front matter.
- [ ] The instruction has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The `description` field value is wrapped in single quotes.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] The instruction has an `applyTo` field that specifies the file or files to which the instructions apply. If they wish to specify multiple file paths they should formated like `'**.js, **.ts'`.

## Chat Mode file guide

**Only apply to files that end in `.agent.md`**

- [ ] The chat mode has markdown front matter.
- [ ] The chat mode has a `description` field.
- [ ] The `description` field is not empty.
- [ ] The `description` field value is wrapped in single quotes.
- [ ] The file name is lower case, with words separated by hyphens.
- [ ] Encourage the use of `tools`, but it's not required.
- [ ] Strongly encourage the use of `model` to specify the model that the chat mode is optimised for.
