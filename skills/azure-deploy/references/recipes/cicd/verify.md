# CI/CD Verification

Check pipeline run status:
- **GitHub**: Actions tab → workflow run
- **Azure DevOps**: Pipelines → pipeline run

## Verify Deployed Resources

```bash
az resource list --resource-group <rg-name> --output table
```

## Health Check

```bash
curl -s https://<endpoint>/health | jq .
```
