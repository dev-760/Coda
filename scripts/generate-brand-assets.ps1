# Generates the Luma platform icon assets from the waveform mark.
#
# The mark is described once in normalised 0..100 units (derived from measuring
# icon.png) and drawn at each required size, so every platform gets crisp
# geometry rather than a resampled crop.
#
# Run:  pwsh -File scripts\generate-brand-assets.ps1

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root 'assets\brand'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Brand palette (matches src/theme/theme.ts)
$BG_HEX     = '#090B10'
$RING_HEX   = '#4A5463'
$MARK_HEX   = '#F3F5F8'

# Normalised mark geometry, 0..100 viewBox, vertically centred on y = 48.
# Each bar: x centre, half width, half height.
$bars = @(
  @{ x = 28.50; hw = 5.50; hh = 2.00 },   # left stub
  @{ x = 37.60; hw = 2.10; hh = 17.40 },  # bar 1
  @{ x = 48.00; hw = 2.05; hh = 30.90 },  # bar 2 (tallest, on axis)
  @{ x = 59.60; hw = 2.05; hh = 13.60 },  # bar 3
  @{ x = 71.05; hw = 2.05; hh = 5.90 }    # bar 4
)
$RING_CX = 48.0
$RING_CY = 48.0
$RING_R  = 45.5
$RING_SW = 1.6
$BAR_CY  = 48.0

function New-Canvas([int]$size) {
  $bmp = New-Object System.Drawing.Bitmap(
    $size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode     = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode   = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @($bmp, $g)
}

function Draw-Ring($g, [double]$scale, [string]$hex) {
  $pen = New-Object System.Drawing.Pen(
    [System.Drawing.ColorTranslator]::FromHtml($hex),
    [float]($RING_SW * $scale))
  $g.DrawEllipse($pen,
    [float](($RING_CX - $RING_R) * $scale),
    [float](($RING_CY - $RING_R) * $scale),
    [float](2 * $RING_R * $scale),
    [float](2 * $RING_R * $scale))
  $pen.Dispose()
}

function Draw-Bars($g, [double]$scale, [string]$hex) {
  $brush = New-Object System.Drawing.SolidBrush(
    [System.Drawing.ColorTranslator]::FromHtml($hex))
  foreach ($bar in $bars) {
    $w = 2 * $bar.hw * $scale
    $h = 2 * $bar.hh * $scale
    $x = ($bar.x - $bar.hw) * $scale
    $y = ($BAR_CY - $bar.hh) * $scale
    # Rounded caps match the source artwork's pill-shaped bars.
    $r = [float]([math]::Min($w, $h) / 2)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddArc([float]$x, [float]$y, [float]$r, [float]$r, 180, 180)
    $path.AddArc([float]($x + $w - $r), [float]$y, [float]$r, [float]$r, 270, 180)
    $path.AddArc([float]($x + $w - $r), [float]($y + $h - $r), [float]$r, [float]$r, 0, 180)
    $path.AddArc([float]$x, [float]($y + $h - $r), [float]$r, [float]$r, 90, 180)
    $path.CloseFigure()
    $g.FillPath($brush, $path)
    $path.Dispose()
  }
  $brush.Dispose()
}

function Save-Png($bmp, $g, [string]$file) {
  $path = Join-Path $outDir $file
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
  "  wrote $file"
}

Write-Host 'Generating Luma brand assets...'

# iOS / universal app icon. iOS rejects transparency, so the background is
# flattened to the brand base colour.
$size = 1024
($bmp, $g) = New-Canvas $size
$scale = $size / 100.0
$bg = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($BG_HEX))
$g.FillRectangle($bg, 0, 0, $size, $size)
$bg.Dispose()
Draw-Ring  $g $scale $RING_HEX
Draw-Bars  $g $scale $MARK_HEX
Save-Png $bmp $g 'icon-1024.png'

# Android adaptive foreground. The launcher masks to the middle ~72% of the
# layer, so the mark is scaled into that safe zone and left transparent.
$fgSize = 1024
($bmp, $g) = New-Canvas $fgSize
$fgScale = ($fgSize / 100.0) * 0.62
$offset  = ($fgSize - ($fgScale * 100)) / 2
$g.TranslateTransform([float]$offset, [float]$offset)
Draw-Ring $g $fgScale $RING_HEX
Draw-Bars $g $fgScale $MARK_HEX
$g.ResetTransform()
Save-Png $bmp $g 'adaptive-icon-foreground.png'

# Adaptive background layer, a flat fill the launcher can tint.
$bgSize = 1024
($bmp, $g) = New-Canvas $bgSize
$fill = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($BG_HEX))
$g.FillRectangle($fill, 0, 0, $bgSize, $bgSize)
$fill.Dispose()
Save-Png $bmp $g 'adaptive-icon-background.png'

Write-Host 'Done.'
