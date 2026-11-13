# U-18 - render mermaid diagrams at AUTHORING time (zero runtime JS for readers).
# Usage:  powershell tools\render-mermaid.ps1 assets\diagrams\attack-flow.mmd
# Output: assets\diagrams\attack-flow.svg  (embed in posts like any image)
param([Parameter(Mandatory = $true)][string]$Mmd)

$root = Split-Path $PSScriptRoot -Parent
$src  = Join-Path $root $Mmd
if (-not (Test-Path $src)) { throw "not found: $src" }
$out  = [IO.Path]::ChangeExtension($src, '.svg')

npx -y @mermaid-js/mermaid-cli -i $src -o $out -b transparent --theme dark
Write-Output "SVG written: $out"
