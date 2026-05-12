# gh Actions — workflows, runs, caches, secrets, variables

## Workflow runs (gh run)

```bash
gh run list                                         # recent runs
gh run list --workflow ci.yml
gh run list --branch main
gh run list --user @me
gh run list --status failure                        # in_progress|success|failure|cancelled|...
gh run list --event push
gh run list --limit 20
gh run list --json databaseId,name,status,conclusion,headBranch,displayTitle

gh run view 123456789                               # details
gh run view 123456789 --log                         # full logs
gh run view 123456789 --log-failed                  # only failed step logs
gh run view 123456789 --job 987654321               # specific job
gh run view 123456789 --web

gh run watch 123456789                              # follow until done
gh run watch 123456789 --interval 5 --exit-status   # non-zero exit on failure

gh run rerun 123456789                              # rerun all
gh run rerun 123456789 --failed                     # only failed jobs
gh run rerun 123456789 --job 987654321

gh run cancel 123456789
gh run delete 123456789

gh run download 123456789                           # all artifacts to ./
gh run download 123456789 --name build              # specific artifact
gh run download 123456789 --dir ./artifacts
gh run download 123456789 --pattern "*.log"
```

## Workflows (gh workflow)

```bash
gh workflow list                                    # all workflows
gh workflow list --all                              # include disabled
gh workflow view ci.yml
gh workflow view ci.yml --yaml                      # print definition
gh workflow view ci.yml --web

gh workflow enable ci.yml
gh workflow disable ci.yml

gh workflow run ci.yml                              # manual dispatch (workflow_dispatch)
gh workflow run ci.yml --ref develop
gh workflow run ci.yml \
  --field version=1.0.0 \
  --field environment=production
gh workflow run ci.yml --json < inputs.json         # stdin inputs
```

## Caches (gh cache)

```bash
gh cache list
gh cache list --branch main --limit 50
gh cache list --sort last_accessed_at --order desc
gh cache list --json id,key,sizeInBytes,ref

gh cache delete 123456789
gh cache delete --all
gh cache delete --key "npm-cache-key"
```

## Secrets (gh secret)

```bash
gh secret list
gh secret list --env production
gh secret list --app actions                        # actions|codespaces|dependabot

gh secret set MY_SECRET                             # prompt for value
echo "$MY_SECRET" | gh secret set MY_SECRET         # from stdin
gh secret set MY_SECRET --body "value"
gh secret set MY_SECRET --env production
gh secret set MY_SECRET --org my-org --visibility all   # all|private|selected
gh secret set MY_SECRET --org my-org --visibility selected --repos repo1,repo2
gh secret set -f secrets.env                        # bulk from dotenv

gh secret delete MY_SECRET
gh secret delete MY_SECRET --env production
```

## Variables (gh variable)

```bash
gh variable list
gh variable list --env production

gh variable set MY_VAR --body "value"
gh variable set MY_VAR --env production --body "value"
gh variable set MY_VAR --org my-org --visibility selected --repos repo1,repo2
gh variable set -f vars.env                         # bulk from dotenv

gh variable get MY_VAR
gh variable delete MY_VAR
gh variable delete MY_VAR --env production
```

## Common pattern: run workflow and wait

```bash
gh workflow run ci.yml --ref main
sleep 3                                             # let the run register
RUN_ID=$(gh run list --workflow ci.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
gh run download "$RUN_ID" --dir ./artifacts
```
