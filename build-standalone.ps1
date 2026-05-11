$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourcePath = Join-Path $root "C10StudyCardsPreview.jsx"
$outputPath = Join-Path $root "index.html"

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Cannot find source file: $sourcePath"
}

$code = Get-Content -LiteralPath $sourcePath -Raw -Encoding UTF8
$code = $code -replace '^\s*import React,\s*\{\s*useEffect,\s*useMemo,\s*useState\s*\}\s*from\s*"react";\s*', "const { useEffect, useMemo, useState } = React;`r`n"
$code = $code -replace 'export default function C10StudyCardsPreview\(\)', 'function C10StudyCardsPreview()'
$code = $code.TrimEnd() + "`r`n`r`nReactDOM.createRoot(document.getElementById(""root"")).render(<C10StudyCardsPreview />);`r`n"
$code = $code -replace '</script>', '<\/script>'

$html = @"
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CSLB C10 Electrical Study Tool</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel" data-presets="env,react">
$code
    </script>
  </body>
</html>
"@

Set-Content -LiteralPath $outputPath -Value $html -Encoding UTF8
Write-Host "Generated $outputPath"
