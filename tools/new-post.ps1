# Scaffold a new post with today's date + full front matter template.
# Usage:
#   powershell tools\new-post.ps1 -Title "SQLi in XYZ CMS"
#   powershell tools\new-post.ps1 -Title "Phan tich RCE" -Slug "rce-analysis" -Tags rce,php
param(
  [Parameter(Mandatory = $true)][string]$Title,
  [string]$Slug = '',
  [string[]]$Tags = @()
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
if (-not $Slug) { $Slug = ($Title.ToLower() -replace '[^a-z0-9]+', '-').Trim('-') }
if (-not $Slug) { throw 'Could not derive a slug - pass -Slug explicitly for Vietnamese titles' }

$date = Get-Date -Format 'yyyy-MM-dd'
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss +0700'
$file = Join-Path $root ("_posts\$date-$Slug.md")
if (Test-Path $file) { throw "Already exists: $file" }

$tagLine = if ($Tags.Count) { ($Tags -join ', ') } else { 'tag1, tag2' }

$body = @"
---
layout: post
title: "$Title"
date: $stamp
categories: [Security]
tags: [$tagLine]
image: "https://0xki29.github.io/blog/assets/og/default.png"
---

## Background

Write here.

## Analysis

Write here.

## Impact

Write here.

## Mitigation

Write here.
"@

[IO.File]::WriteAllText($file, $body, (New-Object System.Text.UTF8Encoding($false)))
Write-Output "Created: _posts/$date-$Slug.md"
Write-Output ''
Write-Output 'Next steps:'
Write-Output '  1. Write content (h2/h3 auto-generate the TOC)'
Write-Output '  2. Screenshots -> assets\ then: powershell tools\optimize-images.ps1'
Write-Output '     embed as ![description of the screenshot](/blog/assets/name.webp)'
Write-Output '  3. (optional) custom OG image: add a New-OgImage line in tools\make-og.ps1, run it,'
Write-Output '     then set the image: line in the post front matter'
Write-Output '  4. (optional) revised post? add  updated: YYYY-MM-DD  + changelog: list'
Write-Output '  5. git add -A ; git commit -m "post: <title>" ; git push'
