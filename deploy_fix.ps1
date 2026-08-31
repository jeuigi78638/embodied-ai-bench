# ============================================================
# deploy_fix.ps1 - update a single file on GitHub via Contents API
# Usage: powershell -ExecutionPolicy Bypass -File deploy_fix.ps1 <relpath> <commitmsg>
# ============================================================
$ErrorActionPreference = "Stop"
$owner = "jeuigi78638"
$repo = "embodied-ai-bench"
$branch = "main"
$project = "C:\Users\28459\Doubao\chats\2026-08-29\new-chat\embodied-ai-bench"

$rel = $args[0]
$msg = $args[1]
if (-not $rel) { Write-Output "ERROR: missing file path"; exit 1 }
if (-not $msg) { $msg = "chore: update $rel" }

$token = (Get-Content (Join-Path $project ".git_token") -Raw).Trim()
if ($token -eq "PASTE_TOKEN_HERE" -or $token.Length -lt 20) { Write-Output "ERROR: token not ready"; exit 1 }
$headers = @{ Authorization = "Bearer $token"; "User-Agent" = "eai-bench-deploy"; Accept = "application/vnd.github+json" }
$base = "https://api.github.com/repos/$owner/$repo/contents/$rel"

$bytes = [System.IO.File]::ReadAllBytes((Join-Path $project $rel))
$b64 = [System.Convert]::ToBase64String($bytes)

# get current file sha (if exists)
$sha = ""
try {
  $meta = Invoke-RestMethod -Uri $base -Headers $headers -Method Get
  $sha = $meta.sha
} catch { $sha = "" }

$bodyObj = @{ message = $msg; content = $b64; branch = $branch }
if ($sha) { $bodyObj.sha = $sha }
$body = $bodyObj | ConvertTo-Json -Compress

$res = Invoke-RestMethod -Uri $base -Headers $headers -Method Put -Body $body -ContentType "application/json"
Write-Output ("UPDATED_OK file=" + $rel + " commit=" + $res.commit.sha)
