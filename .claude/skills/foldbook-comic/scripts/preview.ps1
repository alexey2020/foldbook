<#
  Renders two screenshots of a foldbook comic page with headless Edge/Chrome:

    <OutDir>\book.png   both comics upright, laid out like an open book
                        (cover alone, then spreads 2|3, 4|5, 6|7, back cover),
                        for checking the artwork and the text.
    <OutDir>\sheet.png  the real print sheets as layout.css rotates them,
                        for checking what actually lands on paper.

  Before rendering it checks that the artwork <defs> parse as XML, that ids
  are unique and that all 14 page groups exist. It also leaves book.html
  and a browser-profile folder in OutDir; use a scratch directory.

  Usage (relative paths resolve against the current directory):
    powershell -File preview.ps1 -Html comics\my-comic.html -OutDir <dir>
#>
param(
  [Parameter(Mandatory = $true)][string]$Html,
  [Parameter(Mandatory = $true)][string]$OutDir
)

$ErrorActionPreference = "Stop"

$browser = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $browser) { throw "Neither Edge nor Chrome was found." }

$htmlPath = (Resolve-Path $Html).Path
$src = Get-Content -Raw -Encoding UTF8 $htmlPath

# Sanity-check the artwork before rendering: the browser silently drops
# broken SVG, so a typo shows up only as a missing picture.
$defsStart = $src.IndexOf('<svg width="0"')
$defsEnd = $src.IndexOf('</svg>', $src.IndexOf('</defs>'))
if ($defsStart -lt 0 -or $defsEnd -lt 0) { throw "Artwork <svg><defs> block not found." }
try {
  $defs = [xml]$src.Substring($defsStart, $defsEnd + 6 - $defsStart)
} catch {
  throw "Artwork <defs> is not well-formed XML (unclosed tag? bare '&'?): $($_.Exception.InnerException.Message)"
}
$ids = @($defs.SelectNodes('//@id') | ForEach-Object { $_.Value })
$dupes = $ids | Group-Object | Where-Object Count -gt 1 | ForEach-Object Name
if ($dupes) { Write-Warning "Duplicate ids: $($dupes -join ', ')" }
$pages = foreach ($c in 'a', 'b') { foreach ($n in 1, 2, 3, 45, 6, 7, 8) { "$c-$n" } }
$missing = $pages | Where-Object { $ids -notcontains $_ }
if ($missing) { Write-Warning "Missing page groups: $($missing -join ', ')" }

New-Item -ItemType Directory -Force $OutDir | Out-Null
$OutDir = (Resolve-Path $OutDir).Path
$toUrl = { param($p) "file:///" + ($p -replace '\\', '/') }

# The book view: same file, with the rotation undone and the cells
# reordered into reading order on a 2-column grid. `order` values map DOM
# position (A1,A2,B1,B2,C1,C2,D1,D2) to page number (8,7,1,6,2,5,3,4).
$bookCss = @"
body { flex-direction: row !important; align-items: flex-start !important; }
.sheet { display: grid !important; grid-template-columns: 74.25mm 74.25mm !important;
  grid-template-rows: none !important; width: auto !important; height: auto !important;
  column-gap: 1mm; row-gap: 5mm; background: none !important; box-shadow: none !important; }
.cell { width: 74.25mm !important; height: 105mm !important; background: #fff; border: none !important; }
.cell-inner { position: static !important; transform: none !important; }
.cell:nth-child(1) { order: 8 } .cell:nth-child(2) { order: 7 }
.cell:nth-child(3) { order: 1; grid-column: 2 } .cell:nth-child(4) { order: 6 }
.cell:nth-child(5) { order: 2 } .cell:nth-child(6) { order: 5 }
.cell:nth-child(7) { order: 3 } .cell:nth-child(8) { order: 4 }
"@
# book.html lives in OutDir, so a <base> keeps the page's relative links
# (../layout.css, images next to the comic) resolving as in the original.
$baseUrl = (& $toUrl (Split-Path $htmlPath -Parent)) + "/"
$book = $src.Replace('<head>', "<head><base href=""$baseUrl"">").Replace('</style>', "$bookCss</style>")
$bookHtml = Join-Path $OutDir "book.html"
[IO.File]::WriteAllText($bookHtml, $book, (New-Object Text.UTF8Encoding $false))

$userDir = Join-Path $OutDir "browser-profile"
function Shoot($url, $png, $size) {
  Start-Process -FilePath $browser -Wait -NoNewWindow -ArgumentList @(
    "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
    "--user-data-dir=$userDir", "--window-size=$size", "--screenshot=$png", $url)
}

Shoot (& $toUrl $bookHtml) (Join-Path $OutDir "book.png") "1250,2200"
Shoot (& $toUrl $htmlPath) (Join-Path $OutDir "sheet.png") "900,2500"

Get-ChildItem $OutDir -Filter *.png | Select-Object Name, Length
