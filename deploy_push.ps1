# ============================================================
# deploy_push.ps1 - push project source to GitHub via API (single commit, keep dirs)
# Usage: powershell -ExecutionPolicy Bypass -File deploy_push.ps1
# Token is read from .git_token (gitignored, never committed)
# ============================================================
$ErrorActionPreference = "Stop"
$owner = "jeuigi78638"
$repo = "embodied-ai-bench"
$branch = "main"
$project = "C:\Users\28459\Doubao\chats\2026-08-29\new-chat\embodied-ai-bench"

$token = (Get-Content (Join-Path $project ".git_token") -Raw).Trim()
if ($token -eq "PASTE_TOKEN_HERE" -or $token.Length -lt 20) {
  Write-Output "ERROR: token not ready (.git_token still placeholder)"
  exit 1
}
$headers = @{ Authorization = "Bearer $token"; "User-Agent" = "eai-bench-deploy"; Accept = "application/vnd.github+json" }
$base = "https://api.github.com/repos/$owner/$repo"

try {
  $me = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get
  Write-Output ("TOKEN_OK user=" + $me.login)
} catch {
  Write-Output ("ERROR: token validation failed " + $_.Exception.Message)
  exit 1
}

function Test-Excluded($rel) {
  return ($rel -match "^(\.git|\.next|node_modules|\.git_token|server\.log|preview-.*\.png|next-env\.d\.ts)(/|$)")
}

$files = @()
Get-ChildItem -Path $project -Recurse -File | ForEach-Object {
  $rel = $_.FullName.Substring($project.Length + 1).Replace("\", "/")
  if (-not (Test-Excluded $rel)) {
    $files += [pscustomobject]@{ Path = $rel; Abs = $_.FullName }
  }
}
$files = $files | Sort-Object Path
Write-Output ("FILES_TO_PUSH: " + $files.Count)
if ($files.Count -eq 0) { Write-Output "ERROR: no files to push"; exit 1 }

$head = Invoke-RestMethod -Uri "$base/git/ref/heads/$branch" -Headers $headers -Method Get
$headCommitSha = $head.object.sha
$headCommit = Invoke-RestMethod -Uri "$base/git/commits/$headCommitSha" -Headers $headers -Method Get
$baseTreeSha = $headCommit.tree.sha
Write-Output ("HEAD=" + $headCommitSha + " base_tree=" + $baseTreeSha)

$blobs = @()
foreach ($f in $files) {
  $bytes = [System.IO.File]::ReadAllBytes($f.Abs)
  $b64 = [System.Convert]::ToBase64String($bytes)
  $body = @{ content = $b64; encoding = "base64" } | ConvertTo-Json -Compress
  $blob = Invoke-RestMethod -Uri "$base/git/blobs" -Headers $headers -Method Post -Body $body -ContentType "application/json"
  $blobs += [pscustomobject]@{ path = $f.Path; mode = "100644"; type = "blob"; sha = $blob.sha }
  Write-Output ("  blob + " + $f.Path)
}

$treeBody = @{ base_tree = $baseTreeSha; tree = @($blobs) } | ConvertTo-Json -Depth 5 -Compress
$tree = Invoke-RestMethod -Uri "$base/git/trees" -Headers $headers -Method Post -Body $treeBody -ContentType "application/json"
Write-Output ("TREE=" + $tree.sha)

$commitBody = @{ message = "feat(P0): user accounts + Vercel Postgres sync (auth/robots/posts API, AuthModal, BYOK stays local)"; parents = @($headCommitSha); tree = $tree.sha } | ConvertTo-Json -Depth 4 -Compress
$commit = Invoke-RestMethod -Uri "$base/git/commits" -Headers $headers -Method Post -Body $commitBody -ContentType "application/json"
Write-Output ("COMMIT=" + $commit.sha)

$refBody = @{ sha = $commit.sha; force = $true } | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "$base/git/refs/heads/$branch" -Headers $headers -Method Patch -Body $refBody -ContentType "application/json" | Out-Null
Write-Output ("PUSH_OK branch=" + $branch + " commit=" + $commit.sha + " files=" + $files.Count)
