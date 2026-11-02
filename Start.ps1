$ErrorActionPreference = 'Stop'
$projectPath = $PSScriptRoot
$riwaqUrl = 'http://127.0.0.1:4173'
$riwaqReady = $false
try { $riwaqReady = (Invoke-WebRequest -Uri $riwaqUrl -TimeoutSec 2).StatusCode -eq 200 } catch {}
if (-not $riwaqReady) {
    $riwaqNode = (Get-Command node -ErrorAction SilentlyContinue).Source
    if (-not $riwaqNode) { $riwaqNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
    if (-not (Test-Path -LiteralPath $riwaqNode)) { throw 'Node.js is required. Install it, then run this launcher again.' }
    Start-Process -FilePath $riwaqNode -ArgumentList 'server.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try { if ((Invoke-WebRequest -Uri $riwaqUrl -TimeoutSec 1).StatusCode -eq 200) { $riwaqReady = $true; break } } catch {}
    }
}
if (-not $riwaqReady) { throw 'Could not start Riwaq. Run npm start in the project folder to inspect the error.' }
Start-Process $riwaqUrl
