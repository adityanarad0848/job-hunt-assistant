# Daily runner for the Job Hunt Assistant (Windows / PowerShell).
# Runs the pipeline, logs output, and (if configured) sends a notification.
#
# Register it with Task Scheduler via: node schedule/setup.js  (prints the exact command)

$ErrorActionPreference = "Stop"
$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
Set-Location $ProjectDir

$LogDir = Join-Path $ProjectDir "schedule\logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$Log   = Join-Path $LogDir "run-$Stamp.log"

# Load .env (KEY=VALUE lines) into the process environment.
$EnvFile = Join-Path $ProjectDir ".env"
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
    }
  }
}

$NodeBin = if ($env:NODE_BIN) { $env:NODE_BIN } else { "node" }

"=== Job Hunt Assistant run $Stamp ===" | Tee-Object -FilePath $Log
& $NodeBin run.js @args 2>&1 | Tee-Object -FilePath $Log -Append

if ($env:ENABLE_NOTIFY -eq "1") {
  & $NodeBin schedule\notify.js 2>&1 | Tee-Object -FilePath $Log -Append
}

# Keep only the last 30 logs.
Get-ChildItem $LogDir -Filter "run-*.log" | Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 30 | Remove-Item -Force -ErrorAction SilentlyContinue

"Done. Log: $Log"
