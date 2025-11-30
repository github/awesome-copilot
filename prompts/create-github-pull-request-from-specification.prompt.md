---
agent: 'agent'
description: 'Create GitHub Pull Request for feature request from specification file using pull_request_template.md template.'
tools: ['search/codebase', 'search', 'github', 'create_pull_request', 'update_pull_request', 'get_pull_request_diff']
---
# Create GitHub Pull Request from Specification

Create GitHub Pull Request for the specification at `${workspaceFolder}/.github/pull_request_template.md` .

## Process

1. Analyze specification file template from '${workspaceFolder}/.github/pull_request_template.md' to extract requirements by 'search' tool.
2. Create pull request draft template by using 'create_pull_request' tool on to `${input:targetBranch}`. and make sure don't have any pull request of current branch was exist `get_pull_request`. If has continue to step 4, and skip step 3.
3. Get changes in pull request by using 'get_pull_request_diff' tool to analyze information that was changed in pull Request.
4. Update the pull request body and title created in the previous step using the 'update_pull_request' tool. Incorporate the information from the template obtained in the first step to update the body and title as needed.
5. Switch from draft to ready for review by using 'update_pull_request' tool. To update state of pull request.
6. Using 'get_me' to get username of person was created pull request and assign to `update_issue` tool. To assign pull request
7. Response URL Pull request was create to user.

## Requirements
- Single pull request for the complete specification
- Clear title/pull_request_template.md identifying the specification
- Fill enough information into pull_request_template.md
- Verify against existing pull requests before creation
