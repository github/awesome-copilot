# gh release — Releases & assets

## List / view

```bash
gh release list                                    # recent releases
gh release list --limit 50
gh release list --exclude-drafts --exclude-pre-releases
gh release list --json tagName,name,publishedAt,isDraft,isPrerelease

gh release view                                    # latest non-draft
gh release view v1.0.0
gh release view v1.0.0 --web
gh release view v1.0.0 --json tagName,name,body,assets
```

## Create

```bash
gh release create v1.0.0                                       # interactive
gh release create v1.0.0 --notes "Release notes"
gh release create v1.0.0 --notes-file CHANGELOG.md
gh release create v1.0.0 --generate-notes                      # auto from PRs
gh release create v1.0.0 --title "Version 1.0.0" --target main
gh release create v1.0.0 --draft
gh release create v1.0.0 --prerelease
gh release create v1.0.0 --latest=false                        # don't mark as latest
gh release create v1.0.0 --discussion-category Announcements

# With assets in one shot
gh release create v1.0.0 \
  --notes-file CHANGELOG.md \
  ./dist/*.tar.gz ./dist/checksums.txt
```

## Edit

```bash
gh release edit v1.0.0 --notes "Updated"
gh release edit v1.0.0 --draft=false                 # publish a draft
gh release edit v1.0.0 --tag v1.0.1                  # retag
gh release edit v1.0.0 --latest                      # mark as latest
gh release edit v1.0.0 --prerelease=false
```

## Assets

```bash
gh release upload v1.0.0 ./file.tar.gz
gh release upload v1.0.0 ./a.zip ./b.zip
gh release upload v1.0.0 ./file.tar.gz#"Release bundle"    # display label
gh release upload v1.0.0 ./file.tar.gz --clobber           # overwrite existing

gh release download v1.0.0                                 # all assets
gh release download v1.0.0 --pattern "*.tar.gz"
gh release download v1.0.0 --dir ./downloads
gh release download v1.0.0 --archive zip                   # source archive instead

gh release delete-asset v1.0.0 file.tar.gz
```

## Delete

```bash
gh release delete v1.0.0 --yes
gh release delete v1.0.0 --cleanup-tag --yes           # also delete git tag
```
