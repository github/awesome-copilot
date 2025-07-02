---
mode: "ask, edit, agent"
tools: ["codebase", "editFiles", "problems"]
description: "Create a GitHub Copilot Custom instructions file"
---

# Create a GitHub Copilot Custom instructions file
Add a new or alter an existing custom instructions file for GitHub Copilot to help the Copilot to draft better suggestions and changes. Instructions for the custom instructions give additional information about the current programming languages / SDK's, or specific libraries used like for example the framework to use for the unit tests. 

Include common coding instructions based on the code in the current repository, like:
- coding guidelines (might be in the README or CONTRIBUTING files)
- preferred ways of working
- folder structures if needed

A lot of models try to do to much in one go, as they are very eager to fix every problem they come across, so also include instructions to only make changes to code that is relevant for the change that is being made. The assistant should not change random code just because it has an issue. If the code has nothing to do with the current change it's trying to implement, it should not be changed. This goes for fixing issues, typos, or layout like indentation or new lines. Leave them alone and focus on the needed changes for the ask at hand.
Depending on the different programming environments and package managers, also add instructions to ignore changes to their temporary files, like for example build files, generated or downloaded binaries, or log and other output files. These should end up in the .gitnore file, but sometimes occur in agent mode as well, so best to have instructions to not commit those to the repository at all.

If you can find information about the runtime environment and possible limitations, add that information to the custom instructions file as well. 
