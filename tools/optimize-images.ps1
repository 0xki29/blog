# U-02 - convert post images to WebP (q82) when meaningfully smaller.
# Keeps the PNG (and reports it) when WebP does not save >= 8%.
# Run manually after adding new images:  powershell tools\optimize-images.ps1
$ErrorActionPreference = 'Stop'
$root  = Split-Path $PSScriptRoot -Parent
$cwebp = Join-Path $PSScriptRoot 'node_modules\cwebp-bin\vendor\cwebp.exe'
if (-not (Test-Path $cwebp)) { throw 'cwebp not found - run: cd tools; npm install' }

$results = @()
Get-ChildItem (Join-Path $root 'assets') -Filter *.png |
  Where-Object { $_.DirectoryName -notmatch '\\og$' } |
  ForEach-Object {
    $src = $_.FullName
    $dst = [IO.Path]::ChangeExtension($src, '.webp')
    & $cwebp -quiet -q 82 $src -o $dst | Out-Null
    if (Test-Path $dst) {
      $oldKB = [math]::Round((Get-Item $src).Length / 1KB)
      $newKB = [math]::Round((Get-Item $dst).Length / 1KB)
      if ($newKB -lt $oldKB * 0.92) {
        Remove-Item $src
        $results += [pscustomobject]@{ image = $_.BaseName; beforeKB = $oldKB; afterKB = $newKB; action = 'webp' }
      } else {
        Remove-Item $dst
        $results += [pscustomobject]@{ image = $_.BaseName; beforeKB = $oldKB; afterKB = $oldKB; action = 'kept-png' }
      }
    }
  }

$results | Format-Table -AutoSize
$totBefore = ($results | Measure-Object beforeKB -Sum).Sum
$totAfter  = ($results | Measure-Object afterKB  -Sum).Sum
if ($totBefore) { Write-Output ('TOTAL: {0} KB -> {1} KB  (-{2} pct)' -f $totBefore, $totAfter, [math]::Round(100 - 100 * $totAfter / $totBefore)) }

