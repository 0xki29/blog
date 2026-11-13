# U-01 — generate branded Open Graph images (1200x630) with GDI+
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$W = 1200; $H = 630
$out = Join-Path (Split-Path $PSScriptRoot -Parent) 'assets\og'
New-Item -ItemType Directory -Force $out | Out-Null

function New-OgImage {
  param([string[]]$TitleLines, [string]$OutPath)

  $bmp = New-Object System.Drawing.Bitmap $W, $H
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # midnight-navy background
  $bg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,5,10,20))
  $g.FillRectangle($bg, 0, 0, $W, $H)

  # faint grid
  $gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(22,56,189,248)), 1
  for ($x = 44; $x -lt $W; $x += 44) { $g.DrawLine($gridPen, $x, 0, $x, $H) }
  for ($y = 44; $y -lt $H; $y += 44) { $g.DrawLine($gridPen, 0, $y, $W, $y) }

  # cyan glow top-right (layered translucent ellipses)
  for ($i = 8; $i -ge 1; $i--) {
    $r = $i * 42
    $gl = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(7,34,211,238))
    $g.FillEllipse($gl, 980 - $r, 80 - [int]($r / 2), 2 * $r, $r)
  }

  # gear emblem right side
  $g.TranslateTransform(955, 330)
  $gearPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150,34,211,238)), 7
  for ($i = 0; $i -lt 12; $i++) { $g.RotateTransform(30); $g.DrawRectangle($gearPen, -14, -208, 28, 46) }
  $g.DrawEllipse($gearPen, -168, -168, 336, 336)
  $g.DrawEllipse($gearPen, -104, -104, 208, 208)
  $g.DrawEllipse($gearPen, -26, -26, 52, 52)
  $g.DrawLine($gearPen, 0, -104, 0, -26); $g.DrawLine($gearPen, 0, 104, 0, 26)
  $g.DrawLine($gearPen, -104, 0, -26, 0); $g.DrawLine($gearPen, 104, 0, 26, 0)
  $g.ResetTransform()

  # text
  $fEyebrow = New-Object System.Drawing.Font 'Consolas', 22
  $fTitle   = New-Object System.Drawing.Font 'Consolas', 46, ([System.Drawing.FontStyle]::Bold)
  $fSub     = New-Object System.Drawing.Font 'Consolas', 19
  $cyan  = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,34,211,238))
  $white = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,238,244,251))
  $muted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,124,139,163))

  $g.DrawString('// security research', $fEyebrow, $cyan, 70, 74)
  $y = 136
  foreach ($line in $TitleLines) { $g.DrawString($line, $fTitle, $white, 70, $y); $y += 62 }
  $g.DrawString('web exploitation | CVE root-cause | malware internals', $fSub, $muted, 70, 548)
  $g.DrawString('0xki29.github.io/blog', $fSub, $muted, 884, 580)

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

New-OgImage @('After-action', 'reports declassified.') (Join-Path $out 'default.png')
New-OgImage @('Joomla unauthenticated', 'info disclosure', 'CVE-2023-23752') (Join-Path $out 'joomla-cve-2023-23752.png')
New-OgImage @('Breaking Chrome secret', 'encryption on Windows', '(DPAPI + AES-256-GCM)') (Join-Path $out 'chrome-secret-encryption.png')
New-OgImage @('Arbitrary PHP callback', 'to RCE - NukeViet', 'custom field exploit') (Join-Path $out 'nukeviet-callback-rce.png')

Get-ChildItem $out | Select-Object Name, Length | Format-Table -AutoSize
