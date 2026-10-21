# Noob Mode Glossary

A plain-English reference for technical terms you'll encounter when using Copilot CLI. Organized by category.

---

## 🗂️ Git & Version Control

### Repository (repo)
**Plain English:** A project folder that remembers every change ever made to its files.
**Analogy:** A filing cabinet with a built-in time machine — you can pull out any version of any document from any point in the past.
**Example in context:** "I'll look at the files in this repository" = "I'll look at the files in this project folder."

### Branch
**Plain English:** A separate copy of your project where you can try changes without affecting the original.
**Analogy:** Making a photocopy of a contract to test edits on, without touching the signed original.
**Example in context:** "I'll create a new branch" = "I'll make a copy where I can safely experiment."

### Commit
**Plain English:** Saving a snapshot of your work with a note about what you changed.
**Analogy:** Taking a photo of your desk at the end of each work session, with a Post-it note saying what you did.
**Example in context:** "I'll commit these changes" = "I'll save a snapshot of what I just did."

### Merge
**Plain English:** Combining changes from one copy back into the original.
**Analogy:** Taking the edits from your marked-up photocopy and writing them into the official contract.
**Example in context:** "Let's merge this branch" = "Let's fold these changes back into the main version."

### Pull Request (PR)
**Plain English:** A formal request saying "I made these changes — can someone review them before we make them official?"
**Analogy:** Submitting a redlined document for partner review before it goes to the client.
**Example in context:** "I'll open a pull request" = "I'll submit these changes for review."

### Clone
**Plain English:** Downloading a complete copy of a project from a server to your computer.
**Analogy:** Getting your own copy of a shared case file from the firm's server.
**Example in context:** "Clone the repository" = "Download the project to your computer."

### Fork
**Plain English:** Making your own personal copy of someone else's project on the server.
**Analogy:** Getting your own copy of a template that you can customize without affecting the original template.
**Example in context:** "Fork this repo" = "Create your own copy of this project."

### Diff
**Plain English:** A comparison showing exactly what changed between two versions — what was added, removed, or modified.
**Analogy:** Track Changes in Word, showing red strikethroughs and blue additions.
**Example in context:** "Let me check the diff" = "Let me see exactly what changed."

### Staging Area (Index)
**Plain English:** A waiting area where you place files before saving a snapshot. Like a "to be committed" pile.
**Analogy:** The outbox on your desk — documents you've decided to send but haven't actually mailed yet.
**Example in context:** "I'll stage these files" = "I'll mark these files as ready to be saved."

### Remote
**Plain English:** The copy of your project that lives on a server (like GitHub), as opposed to the copy on your computer.
**Analogy:** The master copy in the firm's cloud storage vs. the copy on your laptop.
**Example in context:** "Push to remote" = "Upload your changes to the server."

### Push
**Plain English:** Uploading your saved changes from your computer to the shared server.
**Analogy:** Syncing your local edits back to the shared drive so everyone can see them.
**Example in context:** "I'll push these commits" = "I'll upload these saved changes to the server."

### Pull
**Plain English:** Downloading the latest changes from the shared server to your computer.
**Analogy:** Refreshing your local copy with any updates your colleagues have made.
**Example in context:** "Pull the latest changes" = "Download any updates from the server."

### Checkout
**Plain English:** Switching to a different branch or version of your project.
**Analogy:** Pulling a different version of a document from the filing cabinet to work on.
**Example in context:** "Checkout the main branch" = "Switch back to the main version of the project."

### Conflict
**Plain English:** When two people changed the same part of the same file, and the computer can't automatically figure out which version to keep.
**Analogy:** Two lawyers edited the same paragraph of a contract differently — someone needs to decide which version wins.
**Example in context:** "There's a merge conflict" = "Two sets of changes overlap and I need you to decide which to keep."

### Stash
**Plain English:** Temporarily saving your current work-in-progress so you can switch to something else, then come back to it later.
**Analogy:** Putting your current papers in a drawer so you can clear your desk for an urgent task, then pulling them back out later.
**Example in context:** "I'll stash your changes" = "I'll save your work-in-progress temporarily."

### HEAD
**Plain English:** The version of the project you're currently looking at / working on.
**Analogy:** The document that's currently open on your screen.
**Example in context:** "HEAD points to main" = "You're currently looking at the main version."

### Tag
**Plain English:** A permanent label attached to a specific version, usually marking a release or milestone.
**Analogy:** Putting a "FINAL — Signed by Client" sticker on a specific version of a contract.
**Example in context:** "I'll tag this as v1.0" = "I'll mark this version as the official 1.0 release."

---

## 💻 File System & Shell

### Terminal (Console)
**Plain English:** The text-based control panel for your computer. You type commands instead of clicking buttons.
**Analogy:** Like texting instructions to your computer instead of pointing and clicking.
**Example in context:** "Open your terminal" = "Open the app where you type commands."

### Shell (Bash, Zsh)
**Plain English:** The program that runs inside your terminal and interprets the commands you type.
**Analogy:** The operator on the other end of a phone line who carries out your requests.
**Example in context:** "Run this in your shell" = "Type this command in your terminal."

### CLI (Command Line Interface)
**Plain English:** A program you interact with by typing commands instead of clicking a visual interface.
**Analogy:** Ordering at a restaurant by speaking to the waiter (CLI) vs. tapping on a tablet menu (GUI).
**Example in context:** "Use the CLI" = "Type commands instead of clicking buttons."

### Directory
**Plain English:** A folder on your computer.
**Analogy:** It's literally a folder. We just use a fancier word sometimes.
**Example in context:** "Navigate to this directory" = "Go to this folder."

### Path
**Plain English:** The address of a file or folder on your computer, showing every folder you'd pass through to get to it.
**Analogy:** Like a street address: Country / State / City / Street / Building — but for files.
**Example in context:** "`~/Desktop/contracts/nda.md`" = "A file called nda.md, in the contracts folder, on your Desktop."

### Root (/)
**Plain English:** The very top-level folder on your computer — every other folder lives inside it.
**Analogy:** The lobby of a building — every floor and room is accessed from here.
**Example in context:** "The root directory" = "The top-most folder on your computer."

### Home Directory (~)
**Plain English:** Your personal folder on the computer. On a Mac, it's `/Users/yourname`.
**Analogy:** Your personal office within the building.
**Example in context:** "`~/Desktop`" = "The Desktop folder inside your personal folder."

### Environment Variable
**Plain English:** A setting stored on your computer that programs can read. Like a sticky note on your monitor that apps can see.
**Analogy:** A name badge that programs can check to learn something about your setup.
**Example in context:** "Set the environment variable" = "Save a setting that programs can look up."

### Pipe (|)
**Plain English:** Sends the output of one command into another command, like an assembly line.
**Analogy:** Handing a document from one person to the next in a relay.
**Example in context:** "`grep 'term' file.txt | wc -l`" = "Find the term, then count how many times it appears."

### Redirect (>, >>)
**Plain English:** Sends output to a file instead of showing it on screen. `>` replaces the file; `>>` adds to it.
**Analogy:** Instead of reading a report aloud, writing it down on paper.
**Example in context:** "`echo 'hello' > file.txt`" = "Write 'hello' into file.txt (replacing whatever was there)."

### Permissions
**Plain English:** Rules about who can read, edit, or run a file. Shown as codes like `rwx` or numbers like `755`.
**Analogy:** Like document permissions in SharePoint — who can view, who can edit, who can share.
**Example in context:** "Change file permissions" = "Change who's allowed to read or edit this file."

### Symlink (Symbolic Link)
**Plain English:** A shortcut that points to another file or folder. Not a copy — just a pointer.
**Analogy:** A hyperlink in a document that takes you to the original file.
**Example in context:** "Create a symlink" = "Create a shortcut pointing to another file."

### stdout / stderr
**Plain English:** Two channels for program output. stdout is normal output; stderr is error messages.
**Analogy:** stdout is the main speaker at a meeting; stderr is someone passing urgent notes.
**Example in context:** "Redirect stderr" = "Send error messages somewhere specific."

### Script
**Plain English:** A file containing a list of commands that run automatically, one after another.
**Analogy:** A recipe — follow the steps in order, and you get the result.
**Example in context:** "Run this script" = "Run this pre-written list of commands."

---

## 🔧 Development Concepts

### API (Application Programming Interface)
**Plain English:** A way for two programs to talk to each other, following agreed-upon rules.
**Analogy:** A waiter in a restaurant — takes your order to the kitchen and brings back what you asked for.
**Example in context:** "Call the API" = "Send a request to another program and get a response."

### Endpoint
**Plain English:** A specific URL where an API accepts requests, like a specific phone extension at a company.
**Analogy:** A specific desk in a government office that handles one type of request.
**Example in context:** "The /users endpoint" = "The specific address that handles user-related requests."

### Server
**Plain English:** A computer (or program) that provides a service when you ask for it. It waits for requests and responds.
**Analogy:** A librarian — you ask for a book, they find it and hand it to you.
**Example in context:** "Start the server" = "Turn on the program that listens for and responds to requests."

### Client
**Plain English:** The program that sends requests to a server. Your web browser is a client.
**Analogy:** The patron at the library who asks the librarian for a book.
**Example in context:** "The client sends a request" = "Your program asks the server for something."

### Database
**Plain English:** An organized collection of data that programs can search, add to, update, and delete from.
**Analogy:** A very sophisticated spreadsheet that multiple programs can read and write to simultaneously.
**Example in context:** "Query the database" = "Look up information in the data storage."

### Dependency
**Plain English:** A pre-built tool or library that a project needs in order to work.
**Analogy:** Reference books you need on your shelf to do your research.
**Example in context:** "Install dependencies" = "Download all the tools and libraries this project needs."

### Package
**Plain English:** A bundle of code that someone else wrote, packaged up for others to use.
**Analogy:** A pre-built toolkit from a hardware store — saves you from building the tools yourself.
**Example in context:** "Install the package" = "Download and add this pre-built toolkit to your project."

### Module
**Plain English:** A self-contained piece of code that handles one specific thing.
**Analogy:** A chapter in a book — it covers one topic and can be read somewhat independently.
**Example in context:** "Import the auth module" = "Load the piece of code that handles login/security."

### Framework
**Plain English:** A pre-built foundation that gives you a structure to build on, with rules about how to organize your code.
**Analogy:** A legal brief template — it gives you the structure, and you fill in the substance.
**Example in context:** "We're using the React framework" = "We're building on top of a pre-made structure called React."

### Build
**Plain English:** Converting source code into something that can actually run.
**Analogy:** Converting a Word doc to a final PDF — the content is the same, but the format is now ready for distribution.
**Example in context:** "Run the build" = "Convert the code into its finished, runnable form."

### Compile
**Plain English:** Translating code from the language humans write in to the language computers understand.
**Analogy:** Translating a contract from English to Japanese so the other party can read it.
**Example in context:** "Compile the code" = "Translate it into computer-readable form."

### Lint / Linter
**Plain English:** A tool that checks your code for common mistakes, style issues, and potential problems — without running it.
**Analogy:** A spell-checker and grammar-checker for code.
**Example in context:** "Run the linter" = "Check the code for mistakes and style issues."

### Test (Unit Test, Integration Test)
**Plain English:** Code that automatically checks whether other code works correctly.
**Analogy:** A checklist QA review — "Does the login page work? Does the search return results? Does the save button actually save?"
**Example in context:** "Run the tests" = "Automatically verify that everything still works correctly."

### Runtime
**Plain English:** The environment where code actually runs. Also refers to the time period when code is actively running.
**Analogy:** The stage where a play is performed (as opposed to the script, which is the code).
**Example in context:** "A runtime error" = "Something went wrong while the program was actually running."

### Deploy
**Plain English:** Taking finished code and putting it somewhere people can use it (a server, a website, an app store).
**Analogy:** Publishing a finished book — moving it from the author's desk to bookstore shelves.
**Example in context:** "Deploy to production" = "Make this available to real users."

---

## 🌐 Web & Networking

### URL (Uniform Resource Locator)
**Plain English:** A web address. The text you type in a browser's address bar.
**Analogy:** A street address, but for websites.
**Example in context:** "`https://github.com/settings`" = "The settings page on GitHub's website."

### HTTP / HTTPS
**Plain English:** The language that web browsers and servers use to talk to each other. HTTPS is the secure (encrypted) version.
**Analogy:** HTTP is sending a postcard (anyone could read it); HTTPS is sending a sealed, locked envelope.
**Example in context:** "Make an HTTP request" = "Send a message to a web server."

### JSON (JavaScript Object Notation)
**Plain English:** A standard format for structuring data that's easy for both humans and computers to read.
**Analogy:** A very organized form with labeled fields, like: `{ "name": "Jane", "role": "Attorney" }`.
**Example in context:** "The API returns JSON" = "The response comes back as structured, labeled data."

### Token
**Plain English:** A digital key or pass that proves your identity, used instead of typing your password every time.
**Analogy:** A building access badge — you swipe it instead of showing your ID each time.
**Example in context:** "Your authentication token" = "The digital key that proves you're logged in."

### Status Code
**Plain English:** A number that a web server sends back to tell you whether your request worked. Common ones:
- **200** = Success ("Here's what you asked for")
- **404** = Not Found ("That page/thing doesn't exist")
- **500** = Server Error ("Something broke on our end")
- **401** = Unauthorized ("You need to log in first")
- **403** = Forbidden ("You're logged in but don't have permission")

### Localhost
**Plain English:** A way of referring to your own computer as if it were a web server. Used for testing.
**Analogy:** Rehearsing a presentation in your own office before giving it in the conference room.
**Example in context:** "`http://localhost:3000`" = "A website running on your own computer, on channel 3000."

### Port
**Plain English:** A numbered channel on a computer. Different services use different ports, like different TV channels.
**Analogy:** Radio frequencies — each station broadcasts on its own frequency so they don't interfere.
**Example in context:** "Running on port 3000" = "Using channel 3000 on your computer."

### REST (RESTful API)
**Plain English:** A common style for building web APIs, where you use standard web addresses and actions (GET, POST, etc.) to interact with data.
**Analogy:** A standardized form system — everyone agrees on how to submit, retrieve, update, and delete records.
**Example in context:** "A RESTful endpoint" = "A web address that follows standard conventions for data access."

---

## 🤖 Copilot CLI Specific

### MCP Server (Model Context Protocol)
**Plain English:** An add-on that gives Copilot CLI extra abilities — like plugins for a web browser.
**Analogy:** Installing a new app on your phone that adds a capability it didn't have before.
**Example in context:** "Configure an MCP server" = "Set up an add-on that gives Copilot new capabilities."

### Tool Call
**Plain English:** When Copilot asks to use one of its built-in abilities (read a file, run a command, search the web, etc.).
**Analogy:** An assistant asking "Can I open this filing cabinet?" before going ahead.
**Example in context:** "Approve this tool call" = "Give me permission to use this specific ability."

### Approval Prompt
**Plain English:** The moment when Copilot stops and asks for your permission before doing something.
**Analogy:** Your assistant saying "Before I send this email, can you review it?"
**Example in context:** "I need your approval" = "I'm asking permission before I do this."

### Context Window
**Plain English:** The total amount of conversation and information Copilot can remember at one time. When it fills up, older parts get summarized or forgotten.
**Analogy:** The size of your desk — you can only have so many papers spread out before you need to file some away.
**Example in context:** "The context window is getting full" = "I'm running low on working memory and may need to summarize our earlier conversation."

### Model
**Plain English:** The AI brain that powers Copilot. Different models (Sonnet, GPT, Gemini) have different strengths.
**Analogy:** Different search engines (Google, Bing) — they all search the web, but they work differently and give slightly different results.
**Example in context:** "Switch to a different model" = "Use a different AI brain."

### Token
**Plain English:** The unit of text that AI models process. Roughly, 1 token ≈ ¾ of a word.
**Analogy:** If the AI reads in syllables instead of whole words, each syllable is a token.
**Example in context:** "This uses 1,000 tokens" = "This is about 750 words' worth of AI processing."

### Skill
**Plain English:** A specialized capability you can add to Copilot CLI for a specific type of task.
**Analogy:** A specialist you can call in — like bringing in a tax expert vs. a contracts expert.
**Example in context:** "Activate a skill" = "Turn on a specialized capability."

### Plugin
**Plain English:** An add-on that extends what Copilot CLI can do, provided by a third party.
**Analogy:** A browser extension — someone else built it, and you install it to add features.
**Example in context:** "Install a plugin" = "Add a third-party feature to Copilot."

### Session
**Plain English:** One continuous conversation with Copilot CLI, from when you start to when you close it.
**Analogy:** A phone call — everything discussed is part of that one session until you hang up.
**Example in context:** "Resume a session" = "Pick up a previous conversation where you left off."

### Custom Instructions
**Plain English:** A file that tells Copilot how to behave — your preferences, rules, and style requirements.
**Analogy:** A brief you give a new associate: "Here's how I like my memos formatted, and here's what to prioritize."
**Example in context:** "Toggle custom instructions" = "Turn on or off a specific set of behavior rules for Copilot."

---

## 📎 Common Commands

| What you see | What it means |
|---|---|
| `ls` | List the files in this folder |
| `cd` | Change directory (go to a different folder) |
| `cat` | Show the contents of a file |
| `cp` | Copy a file |
| `mv` | Move or rename a file |
| `rm` | Delete a file (careful — this is permanent!) |
| `mkdir` | Create a new folder |
| `grep` | Search for specific text in files |
| `curl` | Send a request to a web URL |
| `npm install` | Download the tools/libraries this project needs |
| `git status` | Check what files have been changed |
| `git add` | Mark files as ready to be saved |
| `git commit` | Save a snapshot of your changes |
| `git push` | Upload your changes to the shared server |
| `git pull` | Download the latest updates from the shared server |
