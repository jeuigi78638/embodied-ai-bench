# ============================================================
# deploy_cleanup.ps1 - remove stray '.gitignore)' file from remote and verify tree
# ============================================================
$ErrorActionPreference = "Stop"
$owner = "jeuigi78638"
$repo = "embodied-ai-bench"
$branch = "main"
$project = "C:\Users\28459\Doubao\chats\2026-08-29\new-chat\embodied-ai-bench"

$token = (Get-Content (Join-Path $project ".git_token") -Raw).Trim()
if ($token -eq "PASTE_TOKEN_HERE" -or $token.Length -lt 20) { Write-Output "ERROR: token not ready"; exit 1 }
$headers = @{ Authorization = "Bearer $token"; "User-Agent" = "eai-bench-deploy"; Accept = "application/vnd.github+json" }
$base = "https://api.github.com/repos/$owner/$repo"

# 1) delete stray file
$strayPath = ".gitignore)"
try {
  $meta = Invoke-RestMethod -Uri "$base/contents/$strayPath" -Headers $headers -Method Get
  $delBody = @{ message = "chore: remove stray file"; sha = $meta.sha } | ConvertTo-Json -Compress
  Invoke-RestMethod -Uri "$base/contents/$strayPath" -Headers $headers -Method Delete -Body $delBody -ContentType "application/json" | Out-Null
  Write-Output "DELETED_REMOTE: $strayPath"
} catch {
  if ($_.Exception.Message -match "404") { Write-Output "REMOTE_NOT_FOUND: $strayPath" }
  else { Write-Output ("ERROR deleting: " + $_.Exception.Message) }
}

# 2) verify tree (recursive)
$head = Invoke-RestMethod -Uri "$base/git/ref/heads/$branch" -Headers $headers -Method Get
$headCommit = Invoke-RestMethod -Uri "$base/git/commits/$($head.object.sha)" -Headers $headers -Method Get
$tree = Invoke-RestMethod -Uri "$base/git/trees/$($headCommit.tree.sha)?recursive=1" -Headers $headers -Method Get
$paths = $tree.tree | Where-Object { $_.type -eq "blob" } | ForEach-Object { $_.path }
Write-Output ("REMOTE_FILES: " + $paths.Count)
$paths | Sort-Object | ForEach-Object { Write-Output ("  " + $_) }
