---
mode: 'agent'
tools: ['githubRepo', 'github', 'get_me', 'get_pull_request', 'get_pull_request_comments', 'get_pull_request_diff', 'get_pull_request_files', 'get_pull_request_reviews', 'get_pull_request_status', 'list_pull_requests', 'request_copilot_review']
description: 'List my pull requests in the current repository'
---

Search the current repo (using #githubRepo for the repo info) and list any pull requests you find (using #list_pull_requests) that are assigned to me.

Describe the purpose and details of each pull request.

If a PR is waiting for someone to review, highlight that in the response.

If there were any check failures on the PR, describe them and suggest possible fixes.

If there was no review done by Copilot, offer to request one using #request_copilot_review.
