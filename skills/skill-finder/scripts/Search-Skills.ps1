<#
.SYNOPSIS
    Search and manage Agent Skills.

.DESCRIPTION
    Full-featured skill management:
    - Search local index (fast, offline)
    - GitHub Code Search API fallback
    - Web search URLs as final fallback
    - Add/update sources and skills
    - Star favorite skills
    - Install skills locally
    - Show detailed skill info
    - Tag-based search (#azure #bicep)

    Author: yamapan (https://github.com/aktsmm)
    License: MIT

.PARAMETER Query
    Search keyword (supports #tags like "#azure #bicep")

.PARAMETER Category
    Filter by category (e.g., development, testing, document)

.PARAMETER Source
    Filter by source (e.g., anthropics-skills, obra-superpowers)

.PARAMETER SearchExternal
    Force GitHub search even if found locally

.PARAMETER SearchWeb
    Open web search in browser

.PARAMETER AddSource
    Add a new source repository to the index

.PARAMETER RepoUrl
    Repository URL to add (use with -AddSource)

.PARAMETER Update
    Update skills from all sources

.PARAMETER Info
    Show detailed skill info with SKILL.md content

.PARAMETER Install
    Install skill to local directory

.PARAMETER InstallDir
    Target directory for install (default: ~/.skills)

.PARAMETER Star
    Star a skill

.PARAMETER Unstar
    Unstar a skill

.PARAMETER ListStarred
    List starred skills

.PARAMETER Similar
    Find similar skills

.PARAMETER Stats
    Show index statistics

.PARAMETER Check
    Check tool dependencies

.PARAMETER ListCategories
    List available categories

.PARAMETER ListSources
    List available sources

.EXAMPLE
    .\Search-Skills.ps1 -Query "pdf"
    .\Search-Skills.ps1 -Query "#azure #bicep"
    .\Search-Skills.ps1 -Category "development"
    .\Search-Skills.ps1 -Info "skill-name"
    .\Search-Skills.ps1 -Install "skill-name"
    .\Search-Skills.ps1 -Star "skill-name"
    .\Search-Skills.ps1 -Similar "skill-name"
    .\Search-Skills.ps1 -Stats
    .\Search-Skills.ps1 -Update
#>

[CmdletBinding(DefaultParameterSetName = 'Search')]
param(
    [Parameter(ParameterSetName = 'Search', Position = 0)]
    [string]$Query = "",

    [Parameter(ParameterSetName = 'Search')]
    [string]$Category = "",

    [Parameter(ParameterSetName = 'Search')]
    [string]$Source = "",

    [Parameter(ParameterSetName = 'Search')]
    [switch]$SearchExternal,

    [Parameter(ParameterSetName = 'Search')]
    [switch]$SearchWeb,

    [Parameter(ParameterSetName = 'Update')]
    [switch]$Update,

    [Parameter(ParameterSetName = 'AddSource')]
    [switch]$AddSource,

    [Parameter(ParameterSetName = 'AddSource')]
    [string]$RepoUrl = "",

                            [Parameter(ParameterSetName = 'Info')]
    [string]$Info = "",

    [Parameter(ParameterSetName = 'Install')]
    [string]$Install = "",

    [Parameter(ParameterSetName = 'Install')]
    [string]$InstallDir = "",

    [Parameter(ParameterSetName = 'Star')]
    [string]$Star = "",

    [Parameter(ParameterSetName = 'Unstar')]
    [string]$Unstar = "",

    [Parameter(ParameterSetName = 'ListStarred')]
    [switch]$ListStarred,

    [Parameter(ParameterSetName = 'Similar')]
    [string]$Similar = "",

    [Parameter(ParameterSetName = 'Stats')]
    [switch]$Stats,

    [Parameter(ParameterSetName = 'Check')]
    [switch]$Check,

    [Parameter(ParameterSetName = 'ListCategories')]
    [switch]$ListCategories,

    [Parameter(ParameterSetName = 'ListSources')]
    [switch]$ListSources,

    [Parameter()]
    [switch]$NoInteractive
)

# Configuration
$AutoUpdateDays = 7  # Auto-update if index is older than this

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $scriptDir "..\references\skill-index.json"
$starsPath = Join-Path $scriptDir "..\references\starred-skills.json"
$defaultInstallDir = Join-Path $env:USERPROFILE ".skills"

# Load index
function Get-SkillIndex {
    if (Test-Path $indexPath) {
        return Get-Content $indexPath -Raw | ConvertFrom-Json
    }
    Write-Warning "Index file not found: $indexPath"
    return $null
}

# Save index
function Save-SkillIndex {
    param($Index)
    $Index.lastUpdated = (Get-Date).ToString("yyyy-MM-dd")
    $json = $Index | ConvertTo-Json -Depth 10
    Set-Content -Path $indexPath -Value $json -Encoding UTF8
    Write-Host "✅ Index saved: $indexPath" -ForegroundColor Green
}

# Load stars
function Get-StarredSkills {
    if (Test-Path $starsPath) {
        $data = Get-Content $starsPath -Raw | ConvertFrom-Json
        return @($data.starred)
    }
    return @()
}

# Save stars
function Save-StarredSkills {
    param([string[]]$Starred)
    $data = @{
        starred = $Starred
        lastUpdated = (Get-Date).ToString("yyyy-MM-dd")
    }
    $json = $data | ConvertTo-Json -Depth 5
    Set-Content -Path $starsPath -Value $json -Encoding UTF8
}

# ============================================================================
# Auto-Update Check
# ============================================================================
function Test-IndexOutdated {
    param($Index)
    $lastUpdated = $Index.lastUpdated
    if (-not $lastUpdated) { return $true }
    try {
        $lastDate = [datetime]::Parse($lastUpdated)
        $age = (Get-Date) - $lastDate
        return $age.TotalDays -gt $AutoUpdateDays
    }
    catch {
        return $true
    }
}

function Invoke-AutoUpdateCheck {
    param($Index)
    if (Test-IndexOutdated -Index $Index) {
        $lastUpdated = if ($Index.lastUpdated) { $Index.lastUpdated } else { "unknown" }
        Write-Host "`n⚠️ Index is outdated (last updated: $lastUpdated)" -ForegroundColor Yellow
        try {
            $answer = Read-Host "🔄 Update now? [Y/n]"
            if ($answer -eq "" -or $answer -match "^[Yy]") {
                Update-AllSources
                return Get-SkillIndex
            }
        }
        catch {
            Write-Host "  Skipped" -ForegroundColor Gray
        }
    }
    return $Index
}

# ============================================================================
# Post-Search Suggestions
# ============================================================================
function Show-PostSearchSuggestions {
    param($Index, [string]$Query, $Results)
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "💡 Suggestions" -ForegroundColor Cyan
    
    # 1. Related categories
    if ($Results -and $Results.Count -gt 0) {
        $allCategories = @()
        $Results | Select-Object -First 3 | ForEach-Object {
            $allCategories += $_.categories
        }
        $allCategories = $allCategories | Select-Object -Unique | Select-Object -First 3
        if ($allCategories.Count -gt 0) {
            $catsStr = $allCategories -join ", "
            Write-Host "  🏷️ Related categories: $catsStr" -ForegroundColor Gray
            Write-Host "     → Example: .\Search-Skills.ps1 -Query `"#$($allCategories[0])`"" -ForegroundColor DarkGray
        }
    }
    
    # 2. Similar skills
    if ($Query -and $Index) {
        $similar = $Index.skills | Where-Object { 
            $_.name -like "*$Query*" -or $_.description -like "*$Query*"
        } | Where-Object { $_ -notin $Results } | Select-Object -First 3
        if ($similar) {
            Write-Host "`n  🔍 You might also like:" -ForegroundColor Gray
            foreach ($s in $similar) {
                $desc = if ($s.description.Length -gt 40) { $s.description.Substring(0, 40) } else { $s.description }
                Write-Host "     - $($s.name): $desc" -ForegroundColor DarkGray
            }
        }
    }
    
    # 3. Starred skills count
    $starred = Get-StarredSkills
    if ($starred.Count -gt 0) {
        Write-Host "`n  ⭐ Your favorites: $($starred.Count) skills" -ForegroundColor Yellow
    }
}

function Invoke-DiscoverNewRepos {
    param([string]$Query)
    
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    try {
        $answer = Read-Host "🌐 Search for more repositories? [y/N]"
        if ($answer -match "^[Yy]") {
            Write-Host "`n🔍 Searching GitHub for related repositories..." -ForegroundColor Cyan
            Find-NewRepos -Query $Query
        }
    }
    catch {
        Write-Host "  Skipped" -ForegroundColor Gray
    }
}

function Find-NewRepos {
    param([string]$Query)
    
    $searchTerms = if ($Query) { "$Query SKILL.md agent skills" } else { "SKILL.md agent skills claude copilot" }
    
    try {
        $result = gh search repos $searchTerms --json nameWithOwner,description,stargazersCount --limit 10 2>&1
        if ($LASTEXITCODE -eq 0 -and $result) {
            $repos = $result | ConvertFrom-Json
            if ($repos -and $repos.Count -gt 0) {
                Write-Host "`n📦 Found $($repos.Count) repositories:" -ForegroundColor Cyan
                $i = 1
                foreach ($repo in $repos) {
                    $desc = if ($repo.description.Length -gt 50) { $repo.description.Substring(0, 50) } else { $repo.description }
                    if (-not $desc) { $desc = "No description" }
                    Write-Host "`n  [$i] $($repo.nameWithOwner) ⭐$($repo.stargazersCount)" -ForegroundColor White
                    Write-Host "      $desc" -ForegroundColor Gray
                    $i++
                }
                
                # Ask to add to index
                Write-Host "`n────────────────────────────────────────" -ForegroundColor DarkGray
                try {
                    $choice = Read-Host "📥 Enter repository number to add (blank to skip)"
                    if ($choice -match "^\d+$") {
                        $idx = [int]$choice - 1
                        if ($idx -ge 0 -and $idx -lt $repos.Count) {
                            $repoName = $repos[$idx].nameWithOwner
                            Write-Host "`n📦 Adding $repoName..." -ForegroundColor Cyan
                            & $PSCommandPath -AddSource -RepoUrl "https://github.com/$repoName"
                        }
                    }
                }
                catch { }
            }
            else {
                Write-Host "  No matching repositories found" -ForegroundColor Yellow
            }
        }
        else {
            Write-Host "  ⚠️ Search failed" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  ⚠️ GitHub CLI (gh) not found" -ForegroundColor Yellow
    }
}

# ============================================================================
# Dependency Check
# ============================================================================
if ($Check) {
    Write-Host "`n🔧 Checking Dependencies..." -ForegroundColor Cyan
    
    $tools = @(
        @{ name = "gh"; desc = "GitHub CLI - Required for external search and install" },
        @{ name = "curl"; desc = "cURL - Required for downloading files" },
        @{ name = "pwsh"; desc = "PowerShell - You're running this!" }
    )
    
    foreach ($tool in $tools) {
        try {
            $result = & $tool.name --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                $version = ($result | Select-Object -First 1).ToString().Substring(0, [Math]::Min(50, $result.Length))
                Write-Host "  ✅ $($tool.name): $version" -ForegroundColor Green
            } else {
                Write-Host "  ❌ $($tool.name): Not working properly" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "  ❌ $($tool.name): Not found - $($tool.desc)" -ForegroundColor Red
        }
    }
    exit 0
}

# ============================================================================
# Statistics
# ============================================================================
if ($Stats) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $starred = Get-StarredSkills
    
    Write-Host "`n📊 Skill Index Statistics" -ForegroundColor Cyan
    Write-Host "=" * 50
    Write-Host "📅 Last Updated: $($index.lastUpdated)" -ForegroundColor Gray
    Write-Host "📦 Total Skills: $($index.skills.Count)" -ForegroundColor White
    Write-Host "📁 Sources: $($index.sources.Count)" -ForegroundColor White
    Write-Host "🏷️  Categories: $($index.categories.Count)" -ForegroundColor White
    Write-Host "⭐ Starred: $($starred.Count)" -ForegroundColor Yellow
    
    # Skills per source
    Write-Host "`n📦 Skills by Source:" -ForegroundColor Cyan
    $index.skills | Group-Object -Property source | Sort-Object -Property Count -Descending | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Count)" -ForegroundColor Gray
    }
    
    # Skills per category
    Write-Host "`n🏷️  Skills by Category:" -ForegroundColor Cyan
    $catCounts = @{}
    $index.skills | ForEach-Object {
        foreach ($cat in $_.categories) {
            $catCounts[$cat] = ($catCounts[$cat] ?? 0) + 1
        }
    }
    $catCounts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Gray
    }
    exit 0
}

# ============================================================================
# Star Management
# ============================================================================
if ($Star) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $skill = $index.skills | Where-Object { $_.name -eq $Star } | Select-Object -First 1
    if (-not $skill) {
        Write-Host "❌ Skill not found: $Star" -ForegroundColor Red
        exit 1
    }
    
    $skillId = "$($skill.source)/$($skill.name)"
    $starred = Get-StarredSkills
    
    if ($starred -contains $skillId) {
        Write-Host "⚠️ Already starred: $($skill.name)" -ForegroundColor Yellow
    } else {
        $starred += $skillId
        Save-StarredSkills -Starred $starred
        Write-Host "⭐ Starred: $($skill.name)" -ForegroundColor Green
    }
    exit 0
}

if ($Unstar) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $skill = $index.skills | Where-Object { $_.name -eq $Unstar } | Select-Object -First 1
    if (-not $skill) {
        Write-Host "❌ Skill not found: $Unstar" -ForegroundColor Red
        exit 1
    }
    
    $skillId = "$($skill.source)/$($skill.name)"
    $starred = Get-StarredSkills
    
    if ($starred -contains $skillId) {
        $starred = $starred | Where-Object { $_ -ne $skillId }
        Save-StarredSkills -Starred $starred
        Write-Host "☆ Unstarred: $($skill.name)" -ForegroundColor Yellow
    } else {
        Write-Host "⚠️ Skill is not starred: $($skill.name)" -ForegroundColor Yellow
    }
    exit 0
}

if ($ListStarred) {
    $starred = Get-StarredSkills
    if ($starred.Count -eq 0) {
        Write-Host "☆ No starred skills yet." -ForegroundColor Yellow
        Write-Host "  Use -Star <skill-name> to star a skill." -ForegroundColor Gray
    } else {
        Write-Host "`n⭐ Starred Skills ($($starred.Count)):" -ForegroundColor Cyan
        foreach ($s in $starred) {
            Write-Host "  - $s" -ForegroundColor White
        }
    }
    exit 0
}

# ============================================================================
# Skill Info
# ============================================================================
if ($Info) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $skill = $index.skills | Where-Object { $_.name -eq $Info } | Select-Object -First 1
    if (-not $skill) {
        Write-Host "❌ Skill not found: $Info" -ForegroundColor Red
        
        # Suggest similar
        $similar = $index.skills | Where-Object { $_.name -like "*$Info*" } | Select-Object -First 5
        if ($similar) {
            Write-Host "`n💡 Did you mean:" -ForegroundColor Cyan
            foreach ($s in $similar) {
                Write-Host "  - $($s.name)" -ForegroundColor Gray
            }
        }
        exit 1
    }
    
    $srcInfo = $index.sources | Where-Object { $_.id -eq $skill.source } | Select-Object -First 1
    
    Write-Host "`n📦 $($skill.name)" -ForegroundColor Cyan
    Write-Host "=" * 50
    Write-Host "📝 Description: $($skill.description)" -ForegroundColor White
    Write-Host "📁 Source: $($srcInfo.name)" -ForegroundColor Gray
    Write-Host "🏷️  Categories: $($skill.categories -join ', ')" -ForegroundColor Gray
    Write-Host "📂 Path: $($skill.path)" -ForegroundColor Gray
    
    if ($srcInfo.url -and $skill.path) {
        Write-Host "🔗 URL: $($srcInfo.url)/tree/main/$($skill.path)" -ForegroundColor Blue
    }
    
    # Fetch SKILL.md
    if ($srcInfo.url -match "github\.com/([^/]+/[^/]+)") {
        $repoFull = $Matches[1]
        Write-Host "`n📄 Fetching SKILL.md..." -ForegroundColor Cyan
        
        try {
            $content = gh api "repos/$repoFull/contents/$($skill.path)/SKILL.md" -H "Accept: application/vnd.github.raw" 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "-" * 50
                $lines = $content -split "`n" | Select-Object -First 50
                $lines | ForEach-Object { Write-Host $_ }
                if (($content -split "`n").Count -gt 50) {
                    Write-Host "`n... (truncated)" -ForegroundColor DarkGray
                }
            }
        }
        catch {
            Write-Host "  ⚠️ Could not fetch SKILL.md" -ForegroundColor Yellow
        }
    }
    exit 0
}

# ============================================================================
# Install Skill
# ============================================================================
if ($Install) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $skill = $index.skills | Where-Object { $_.name -eq $Install } | Select-Object -First 1
    if (-not $skill) {
        Write-Host "❌ Skill not found: $Install" -ForegroundColor Red
        exit 1
    }
    
    $srcInfo = $index.sources | Where-Object { $_.id -eq $skill.source } | Select-Object -First 1
    
    if (-not $srcInfo.url -or -not $skill.path) {
        Write-Host "❌ Cannot install: missing URL or path information" -ForegroundColor Red
        exit 1
    }
    
    $targetDir = if ($InstallDir) { $InstallDir } else { $defaultInstallDir }
    $installPath = Join-Path $targetDir $skill.name
    
    if ($srcInfo.url -notmatch "github\.com/([^/]+/[^/]+)") {
        Write-Host "❌ Invalid source URL" -ForegroundColor Red
        exit 1
    }
    $repoFull = $Matches[1]
    
    Write-Host "📥 Installing $($skill.name)..." -ForegroundColor Cyan
    Write-Host "   From: $($srcInfo.url)" -ForegroundColor Gray
    Write-Host "   To: $installPath" -ForegroundColor Gray
    
    # Create directory
    if (-not (Test-Path $installPath)) {
        New-Item -ItemType Directory -Path $installPath -Force | Out-Null
    }
    
    try {
        # Get file list
        $items = gh api "repos/$repoFull/contents/$($skill.path)" 2>&1 | ConvertFrom-Json
        
        foreach ($item in $items) {
            if ($item.type -eq "file" -and $item.name -and $item.download_url) {
                Write-Host "   📄 $($item.name)" -ForegroundColor Gray
                $filePath = Join-Path $installPath $item.name
                curl -sL -o $filePath $item.download_url
            }
        }
        
        Write-Host "`n✅ Installed to: $installPath" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 0
}

# ============================================================================
# Similar Skills
# ============================================================================
if ($Similar) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    $skill = $index.skills | Where-Object { $_.name -eq $Similar } | Select-Object -First 1
    
    if ($skill) {
        # Find by matching categories
        $targetCats = $skill.categories
        $similarSkills = $index.skills | Where-Object { 
            $_.name -ne $skill.name -and ($_.categories | Where-Object { $targetCats -contains $_ })
        } | Select-Object -First 5
        
        if ($similarSkills) {
            Write-Host "`n💡 Skills similar to '$($skill.name)':" -ForegroundColor Cyan
            foreach ($s in $similarSkills) {
                $cats = ($s.categories | Select-Object -First 3) -join ", "
                Write-Host "  - $($s.name) ($cats)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  No similar skills found." -ForegroundColor Yellow
        }
    } else {
        # Fuzzy match
        $fuzzy = $index.skills | Where-Object { $_.name -like "*$Similar*" } | Select-Object -First 5
        if ($fuzzy) {
            Write-Host "`n💡 Skills matching '$Similar':" -ForegroundColor Cyan
            foreach ($s in $fuzzy) {
                Write-Host "  - $($s.name)" -ForegroundColor Gray
            }
        } else {
            Write-Host "  No matching skills found." -ForegroundColor Yellow
        }
    }
    exit 0
}

# ============================================================================
# Update All Sources
# ============================================================================
if ($Update) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }
    
    Write-Host "🔄 Updating all sources..." -ForegroundColor Cyan
    
    foreach ($src in $index.sources) {
        if ($src.url -match "github\.com/([^/]+/[^/]+)") {
            $repoFull = $Matches[1]
            Write-Host "`n📦 $($src.id) ($repoFull)" -ForegroundColor White
            
            $foundSkills = @()
            
            # Method 1: Use GitHub Code Search API to find all SKILL.md files
            try {
                $rawOutput = gh api search/code -f "q=repo:$repoFull filename:SKILL.md" 2>$null
                if ($LASTEXITCODE -eq 0 -and $rawOutput) {
                    $data = $rawOutput | ConvertFrom-Json
                    $items = $data.items
                    if ($items -and $items.Count -gt 0) {
                        $seenPaths = @{}
                        foreach ($item in $items) {
                            $path = $item.path
                            if ($path -and $path.EndsWith("SKILL.md")) {
                                # Get parent directory (skill folder)
                                $parts = $path -split "/"
                                $parent = ($parts[0..($parts.Count - 2)]) -join "/"
                                if ($parent -and -not $seenPaths.ContainsKey($parent)) {
                                    $seenPaths[$parent] = $true
                                    $skillName = $parts[$parts.Count - 2]
                                    $foundSkills += @{ name = $skillName; path = $parent }
                                }
                            }
                        }
                        
                        if ($foundSkills.Count -gt 0) {
                            Write-Host "  📂 Found $($foundSkills.Count) skills via Code Search" -ForegroundColor Green
                            foreach ($skill in $foundSkills) {
                                Write-Host "    - $($skill.name) ($($skill.path))" -ForegroundColor Gray
                            }
                        }
                    }
                }
            }
            catch {
                Write-Host "  ⚠️ Code Search failed, falling back to directory scan..." -ForegroundColor Yellow
            }
            
            # Method 2: Fallback to directory-based search if Code Search fails or returns empty
            if ($foundSkills.Count -eq 0) {
                $skillsPaths = @("skills", ".github/skills", ".claude/skills", "scientific-skills")
                $foundInSubdir = $false
                
                foreach ($path in $skillsPaths) {
                    try {
                        $rawOutput = gh api "repos/$repoFull/contents/$path" 2>$null
                        if ($LASTEXITCODE -eq 0 -and $rawOutput -and $rawOutput -notmatch '"message"') {
                            $items = $rawOutput | ConvertFrom-Json
                            if ($items) {
                                $foundInSubdir = $true
                                Write-Host "  📂 Found $(@($items).Count) items in $path" -ForegroundColor Green
                                foreach ($item in $items) {
                                    if ($item.type -eq "dir") {
                                        $foundSkills += @{ name = $item.name; path = "$path/$($item.name)" }
                                        Write-Host "    - $($item.name)" -ForegroundColor Gray
                                    }
                                }
                                break
                            }
                        }
                    }
                    catch { }
                }
                
                # If no skills/ directory found, check root for SKILL.md in subdirectories
                if (-not $foundInSubdir) {
                    try {
                        $rawOutput = gh api "repos/$repoFull/contents" 2>$null
                        if ($LASTEXITCODE -eq 0 -and $rawOutput) {
                            $items = $rawOutput | ConvertFrom-Json
                            $skillDirs = @()
                            $skipDirs = @(".", ".github", ".claude", "docs", "examples", "tests", "node_modules", "dist", "build", "src", "lib", "scripts")
                            
                            foreach ($item in $items) {
                                if ($item.type -eq "dir" -and $item.name -and -not $item.name.StartsWith(".")) {
                                    if ($skipDirs -notcontains $item.name) {
                                        $skillMdCheck = gh api "repos/$repoFull/contents/$($item.name)/SKILL.md" 2>$null
                                        if ($LASTEXITCODE -eq 0 -and $skillMdCheck -and $skillMdCheck -notmatch '"message"') {
                                            $foundSkills += @{ name = $item.name; path = $item.name }
                                        }
                                    }
                                }
                            }
                            
                            if ($foundSkills.Count -gt 0) {
                                Write-Host "  📂 Found $($foundSkills.Count) skills at root level" -ForegroundColor Green
                                foreach ($skill in $foundSkills) {
                                    Write-Host "    - $($skill.name)" -ForegroundColor Gray
                                }
                            }
                        }
                    }
                    catch { }
                }
            }
            
            # Add found skills to index
            foreach ($skill in $foundSkills) {
                $existing = $index.skills | Where-Object { $_.name -eq $skill.name -and $_.source -eq $src.id }
                if (-not $existing) {
                    $newSkill = [PSCustomObject]@{
                        name        = $skill.name
                        source      = $src.id
                        path        = $skill.path
                        categories  = @("community")
                        description = "$($skill.name) skill"
                    }
                    $index.skills += $newSkill
                    Write-Host "    ✅ $($skill.name)" -ForegroundColor Green
                } else {
                    Write-Host "    ⏭️ $($skill.name) (exists)" -ForegroundColor Gray
                }
            }
        }
    }
    
    Save-SkillIndex -Index $index
    Write-Host "`n✅ Update complete!" -ForegroundColor Green
    exit 0
}

# ============================================================================
# Add source
# ============================================================================
if ($AddSource) {
    $index = Get-SkillIndex
    if (-not $index) { exit 1 }

    # Check URL
    if (-not $RepoUrl) {
        Write-Error "Please specify repository URL: -RepoUrl 'https://github.com/owner/repo'"
        exit 1
    }

    # Parse owner/repo from URL
    if ($RepoUrl -match "github\.com[/:]([^/]+)/([^/]+)") {
        $owner = $Matches[1]
        $repo = $Matches[2] -replace "\.git$", ""
        $repoFullName = "$owner/$repo"
    }
    else {
        Write-Error "Invalid GitHub URL: $RepoUrl"
        exit 1
    }

    # Check if exists
    $existingSource = $index.sources | Where-Object { $_.url -like "*$repoFullName*" }
    if ($existingSource) {
        Write-Warning "Source already exists: $($existingSource.id)"
        exit 0
    }

    # Generate ID and name
    $sourceId = $repo.ToLower() -replace "[^a-z0-9-]", "-"
    $sourceName = $repo
    $sourceType = "community"
    $sourceDesc = "Skills from $owner/$repo"

    # Add source
    $newSource = [PSCustomObject]@{
        id          = $sourceId
        name        = $sourceName
        url         = "https://github.com/$repoFullName"
        type        = $sourceType
        description = $sourceDesc
    }

    $index.sources += $newSource
    Save-SkillIndex -Index $index

    Write-Host "`n📦 Added new source:" -ForegroundColor Cyan
    Write-Host "  ID: $sourceId" -ForegroundColor White
    Write-Host "  URL: https://github.com/$repoFullName" -ForegroundColor Blue

    # Fetch skills
    Write-Host "`n🔍 Searching for skills..." -ForegroundColor Cyan
    
    # Search for skills directory
    $skillsPath = @("skills", ".github/skills", ".claude/skills")
    $foundSkills = @()
    foreach ($path in $skillsPath) {
        try {
            $rawOutput = gh api "repos/$repoFullName/contents/$path" 2>$null
            if ($LASTEXITCODE -eq 0 -and $rawOutput -and $rawOutput -notmatch '"message"') {
                $items = $rawOutput | ConvertFrom-Json | ForEach-Object { $_.name }
                if ($items) {
                    Write-Host "  📂 Found $(@($items).Count) skills in $path" -ForegroundColor Green
                    foreach ($skillName in $items) {
                        $foundSkills += @{ name = $skillName; path = "$path/$skillName" }
                        Write-Host "    - $skillName" -ForegroundColor Gray
                    }
                    break
                }
            }
        }
        catch { }
    }

    if ($foundSkills.Count -eq 0) {
        Write-Host "  ⚠️ No skills directory found" -ForegroundColor Yellow
    }

    # Add found skills
    if ($foundSkills.Count -gt 0) {
        Write-Host "`n✨ Adding skills to index..." -ForegroundColor Cyan
        foreach ($skill in $foundSkills) {
            $existingSkill = $index.skills | Where-Object { $_.name -eq $skill.name -and $_.source -eq $sourceId }
            if (-not $existingSkill) {
                $newSkill = [PSCustomObject]@{
                    name        = $skill.name
                    source      = $sourceId
                    path        = $skill.path
                    categories  = @("community")
                    description = "$($skill.name) skill"
                }
                $index.skills += $newSkill
                Write-Host "  ✅ $($skill.name)" -ForegroundColor Green
            }
            else {
                Write-Host "  ⏭️ $($skill.name) (exists)" -ForegroundColor Gray
            }
        }
        Save-SkillIndex -Index $index
    }
    exit 0
}

# カテゴリ一覧を表示
if ($ListCategories) {
    $index = Get-SkillIndex
    if ($index) {
        Write-Host "`n📁 利用可能なカテゴリ:" -ForegroundColor Cyan
        $index.categories | ForEach-Object {
            Write-Host "  $($_.id)" -ForegroundColor White -NoNewline
            Write-Host " - $($_.description)" -ForegroundColor Gray
        }
    }
    exit 0
}

# ソース一覧を表示
if ($ListSources) {
    $index = Get-SkillIndex
    if ($index) {
        Write-Host "`n📦 利用可能なソース:" -ForegroundColor Cyan
        $index.sources | ForEach-Object {
            Write-Host "  $($_.id)" -ForegroundColor White -NoNewline
            Write-Host " [$($_.type)]" -ForegroundColor Yellow -NoNewline
            Write-Host " - $($_.name)" -ForegroundColor Gray
            Write-Host "    $($_.url)" -ForegroundColor DarkCyan
        }
    }
    exit 0
}

# インデックス更新
if ($UpdateIndex) {
    Write-Host "🔄 インデックスを更新中..." -ForegroundColor Cyan
    
    $sources = @(
        @{ id = "anthropics-skills"; repo = "anthropics/skills"; path = "skills" },
        @{ id = "obra-superpowers"; repo = "obra/superpowers"; path = "skills" },
        @{ id = "composio-awesome"; repo = "ComposioHQ/awesome-claude-skills"; path = "" }
    )
    
    foreach ($src in $sources) {
        Write-Host "  📥 $($src.repo) からスキルを取得中..." -ForegroundColor Gray
        try {
            $apiPath = if ($src.path) { "repos/$($src.repo)/contents/$($src.path)" } else { "repos/$($src.repo)/contents" }
            $items = gh api $apiPath --jq '.[].name' 2>$null
            if ($items) {
                Write-Host "    ✅ $(@($items).Count) 件取得" -ForegroundColor Green
            }
        }
        catch {
            Write-Warning "    ⚠️ 取得失敗: $($_.Exception.Message)"
        }
    }
    
    Write-Host "`n💡 手動で references/skill-index.json を編集してスキルを追加してください。" -ForegroundColor Yellow
    exit 0
}

# ローカル検索 (タグ検索対応)
function Search-LocalIndex {
    param([string]$Query, [string]$Category, [string]$Source)
    
    $index = Get-SkillIndex
    if (-not $index) { return @() }
    
    $results = $index.skills
    $starred = Get-StarredSkills
    
    # タグ抽出 (#azure #bicep など)
    $tags = @()
    $cleanQuery = $Query
    if ($Query -match '#(\w+)') {
        $tags = [regex]::Matches($Query, '#(\w+)') | ForEach-Object { $_.Groups[1].Value }
        $cleanQuery = ($Query -replace '#\w+', '').Trim()
    }
    
    # キーワードフィルタ
    if ($cleanQuery) {
        $results = $results | Where-Object {
            $_.name -like "*$cleanQuery*" -or $_.description -like "*$cleanQuery*"
        }
    }
    
    # タグフィルタ (カテゴリとマッチ)
    if ($tags.Count -gt 0) {
        $results = $results | Where-Object {
            $skillCats = $_.categories | ForEach-Object { $_.ToLower() }
            $matchedTags = $tags | Where-Object { $skillCats -contains $_.ToLower() }
            $matchedTags.Count -gt 0
        }
    }
    
    # カテゴリフィルタ
    if ($Category) {
        $results = $results | Where-Object {
            $_.categories -contains $Category
        }
    }
    
    # ソースフィルタ
    if ($Source) {
        $results = $results | Where-Object {
            $_.source -eq $Source
        }
    }
    
    # ソース情報とスター状態を付加
    $results | ForEach-Object {
        $skill = $_
        $sourceInfo = $index.sources | Where-Object { $_.id -eq $skill.source }
        $skillId = "$($skill.source)/$($skill.name)"
        $skill | Add-Member -NotePropertyName "sourceUrl" -NotePropertyValue $sourceInfo.url -Force
        $skill | Add-Member -NotePropertyName "sourceName" -NotePropertyValue $sourceInfo.name -Force
        $skill | Add-Member -NotePropertyName "starred" -NotePropertyValue ($starred -contains $skillId) -Force
    }
    
    # スター付きを先頭に
    $results = $results | Sort-Object -Property @{Expression={$_.starred}; Descending=$true}, name
    
    return $results
}

# 外部検索 (GitHub)
function Search-External {
    param([string]$Query)
    
    Write-Host "`n🌐 GitHub を検索中..." -ForegroundColor Cyan
    
    $searchQuery = if ($Query) { "$Query filename:SKILL.md" } else { "filename:SKILL.md path:.github/skills" }
    
    try {
        $results = gh search code $searchQuery --json repository,path,url --limit 15 2>&1 | ConvertFrom-Json
        return $results
    }
    catch {
        Write-Warning "GitHub 検索に失敗しました: $($_.Exception.Message)"
        return @()
    }
}

# Web 検索 (最終フォールバック)
function Search-Web {
    param([string]$Query, [switch]$OpenBrowser)
    
    $searchTerms = if ($Query) { 
        "claude skill $Query OR copilot skill $Query SKILL.md"
    } else { 
        "claude skills SKILL.md github"
    }
    
    $encodedQuery = [System.Web.HttpUtility]::UrlEncode($searchTerms)
    
    # 各検索エンジンの URL
    $urls = @{
        "Google"     = "https://www.google.com/search?q=$encodedQuery"
        "Bing"       = "https://www.bing.com/search?q=$encodedQuery"
        "DuckDuckGo" = "https://duckduckgo.com/?q=$encodedQuery"
    }
    
    Write-Host "`n🔎 Web 検索 URL:" -ForegroundColor Cyan
    foreach ($engine in $urls.Keys) {
        Write-Host "  $engine : " -ForegroundColor Gray -NoNewline
        Write-Host $urls[$engine] -ForegroundColor Blue
    }
    
    if ($OpenBrowser) {
        Write-Host "`n  ブラウザで Google 検索を開きます..." -ForegroundColor Yellow
        Start-Process $urls["Google"]
    }
    
    return $urls
}

# メイン検索処理
Write-Host "`n🔍 スキルを検索中..." -ForegroundColor Cyan

# インデックス読み込み
$index = Get-SkillIndex
if (-not $index) { exit 1 }

# 自動更新チェック（インタラクティブモード時のみ）
if (-not $NoInteractive) {
    $index = Invoke-AutoUpdateCheck -Index $index
}

# 1. ローカル検索
$localResults = Search-LocalIndex -Query $Query -Category $Category -Source $Source

if ($localResults -and $localResults.Count -gt 0) {
    Write-Host "`n📋 ローカルインデックスから $($localResults.Count) 件見つかりました:" -ForegroundColor Green
    
    $i = 1
    foreach ($skill in $localResults) {
        $starMark = if ($skill.starred) { " ⭐" } else { "" }
        Write-Host "`n[$i] " -ForegroundColor Yellow -NoNewline
        Write-Host "$($skill.name)$starMark" -ForegroundColor White
        Write-Host "    📝 $($skill.description)" -ForegroundColor Gray
        Write-Host "    📦 $($skill.sourceName)" -ForegroundColor DarkCyan
        Write-Host "    🏷️  $($skill.categories -join ', ')" -ForegroundColor DarkGray
        Write-Host "    🔗 $($skill.sourceUrl)/$($skill.path)" -ForegroundColor Blue
        $i++
    }
}
else {
    Write-Host "  ローカルインデックスに該当なし" -ForegroundColor Yellow
}

# 2. 外部検索 (ローカルで見つからない、または強制検索)
$externalFound = $false
if ((-not $localResults -or $localResults.Count -eq 0) -or $SearchExternal) {
    $externalResults = Search-External -Query $Query
    
    if ($externalResults -and $externalResults.Count -gt 0) {
        $externalFound = $true
        Write-Host "`n🌐 GitHub から $($externalResults.Count) 件見つかりました:" -ForegroundColor Green
        
        $i = 1
        foreach ($item in $externalResults) {
            $repoName = $item.repository.nameWithOwner
            Write-Host "`n[$i] " -ForegroundColor Yellow -NoNewline
            Write-Host $repoName -ForegroundColor White
            Write-Host "    📄 $($item.path)" -ForegroundColor Gray
            Write-Host "    🔗 https://github.com/$repoName" -ForegroundColor Blue
            $i++
        }
        
        Write-Host "`n💡 ヒント: -AddSource でリポジトリをインデックスに追加できます" -ForegroundColor Yellow
    }
    else {
        Write-Host "`n  GitHub でも見つかりませんでした" -ForegroundColor Yellow
    }
}

# 3. Web 検索 (ローカルも GitHub も見つからない場合、または -SearchWeb 指定時)
$totalFound = ($localResults.Count -gt 0) -or $externalFound
if ((-not $totalFound -and $Query) -or $SearchWeb) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    if (-not $totalFound) {
        Write-Host "📭 ローカル・GitHub ともに見つかりませんでした。" -ForegroundColor Yellow
    }
    Write-Host "   Web 検索を試してみてください:" -ForegroundColor Yellow
    Search-Web -Query $Query -OpenBrowser:$SearchWeb | Out-Null
}

# 4. 類似スキル提案 (結果が少ない場合)
if ($Query -and $localResults.Count -lt 3) {
    $similar = $index.skills | Where-Object { 
        $_.name -like "*$Query*" -and $_ -notin $localResults 
    } | Select-Object -First 3
    if ($similar) {
        Write-Host "`n💡 こちらもおすすめ:" -ForegroundColor Cyan
        foreach ($s in $similar) {
            Write-Host "  - $($s.name)" -ForegroundColor Gray
        }
    }
}

# 5. 検索後のサジェスト表示
if ($Query) {
    Show-PostSearchSuggestions -Index $index -Query $Query -Results $localResults
}

# 6. 他のリポジトリを探すか聞く（ローカル結果が少ない場合、インタラクティブモード時のみ）
if ($Query -and $localResults.Count -lt 5 -and (-not $SearchExternal) -and (-not $NoInteractive)) {
    Invoke-DiscoverNewRepos -Query $Query
}

Write-Host ""
