param(
  [switch]$NoInstall,
  [int]$BackendPort = 8000,
  [int]$ExitAfterSeconds = 0,
  [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'

function Get-Utf8Text {
  param([string]$Base64)
  return [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Base64))
}

$MSG_PY_NOT_FOUND = Get-Utf8Text '5pyq5om+5YiwIFB5dGhvbu+8muivt+WcqOS7k+W6k+agueebruW9leWIm+W7uiAudmVudu+8jOaIluehruS/nSBweXRob24g5ZyoIFBBVEgg5Lit44CC'
$MSG_BACKEND_DIR_PREFIX = Get-Utf8Text '5pyq5om+5Yiw5ZCO56uv55uu5b2V77ya'
$MSG_FRONTEND_DIR_PREFIX = Get-Utf8Text '5pyq5om+5Yiw5YmN56uv55uu5b2V77ya'
$MSG_NPM_NOT_FOUND = Get-Utf8Text '5pyq5om+5YiwIG5wbe+8muivt+WFiOWuieijhSBOb2RlLmpz77yM5bm256Gu5L+dIG5wbSDlnKggUEFUSCDkuK3jgII='
$MSG_START_BACKEND = Get-Utf8Text '5q2j5Zyo5ZCv5Yqo5ZCO56uv77yIRmFzdEFQSe+8iS4uLg=='
$MSG_START_FRONTEND = Get-Utf8Text '5q2j5Zyo5ZCv5Yqo5YmN56uv77yIUmVhY3TvvIkuLi4='
$MSG_STARTED_PREFIX = Get-Utf8Text '5bey5ZCv5Yqo44CC5ZCO56uv77yaaHR0cDovL2xvY2FsaG9zdDo='
$MSG_STARTED_MID = Get-Utf8Text 'ICDliY3nq6/vvJpodHRwOi8vbG9jYWxob3N0OjMwMDA='

$root = $PSScriptRoot
$backendDir = Join-Path $root 'backend_notes_app'
$frontendDir = Join-Path $root 'frontend_notes_app'

$pythonCandidates = @(
  (Join-Path $root '.venv\Scripts\python.exe'),
  (Join-Path $root '.venv\Scripts\python'),
  'python'
)

$python = $null
foreach ($candidate in $pythonCandidates) {
  if ($candidate -eq 'python') {
    if (Get-Command python -ErrorAction SilentlyContinue) {
      $python = 'python'
      break
    }
  } elseif (Test-Path $candidate) {
    $python = $candidate
    break
  }
}

if (-not $python) {
  throw $MSG_PY_NOT_FOUND
}

if (-not (Test-Path $backendDir)) {
  throw ($MSG_BACKEND_DIR_PREFIX + $backendDir)
}
if (-not (Test-Path $frontendDir)) {
  throw ($MSG_FRONTEND_DIR_PREFIX + $frontendDir)
}

if (-not $NoInstall) {
  $requirementsPath = Join-Path $backendDir 'requirements.txt'
  if (Test-Path $requirementsPath) {
    & $python -m pip install -r $requirementsPath
  }

  $nodeModules = Join-Path $frontendDir 'node_modules'
  if (-not (Test-Path $nodeModules)) {
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
      throw $MSG_NPM_NOT_FOUND
    }
    Push-Location $frontendDir
    try {
      npm install
    } finally {
      Pop-Location
    }
  }
}

Write-Host $MSG_START_BACKEND
$pythonExe = $python
if ($pythonExe -eq 'python') {
  $pythonExe = (Get-Command python).Source
}

$npmExe = $null
if (Get-Command npm -ErrorAction SilentlyContinue) {
  $npmExe = (Get-Command npm).Source
}

function Wait-TcpPort {
  param(
    [string]$HostName,
    [int]$Port,
    [int]$TimeoutSeconds = 30
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = New-Object System.Net.Sockets.TcpClient
      try {
        $iar = $client.BeginConnect($HostName, $Port, $null, $null)
        if ($iar.AsyncWaitHandle.WaitOne(300)) {
          $client.EndConnect($iar)
          return $true
        }
      } finally {
        $client.Close()
      }
    } catch {
    }
    Start-Sleep -Milliseconds 300
  }
  return $false
}

$backendArgs = @('-m', 'uvicorn', 'backend_notes_app.main:app', '--reload', '--reload-dir', 'backend_notes_app', '--port', "$BackendPort")
$backendProcess = Start-Process -FilePath $pythonExe -WorkingDirectory $root -ArgumentList $backendArgs -PassThru

Write-Host $MSG_START_FRONTEND
if (-not $npmExe) {
  throw $MSG_NPM_NOT_FOUND
}

$previousBrowser = $env:BROWSER
try {
  $env:BROWSER = 'none'
  $frontendArgs = @('start')
  $frontendProcess = Start-Process -FilePath $npmExe -WorkingDirectory $frontendDir -ArgumentList $frontendArgs -PassThru
} finally {
  $env:BROWSER = $previousBrowser
}

Write-Host ($MSG_STARTED_PREFIX + $BackendPort + $MSG_STARTED_MID)

if (-not $NoBrowser) {
  if (Wait-TcpPort -HostName 'localhost' -Port 3000 -TimeoutSeconds 60) {
    try {
      Start-Process 'http://localhost:3000'
    } catch {
    }
  }
}

$exitRequested = $false
try {
  if ($ExitAfterSeconds -gt 0) {
    Start-Sleep -Seconds $ExitAfterSeconds
    $exitRequested = $true
  }

  while (-not $exitRequested) {
    $backendProcess.Refresh()
    $frontendProcess.Refresh()

    if ($backendProcess.HasExited -or $frontendProcess.HasExited) {
      break
    }
    Start-Sleep -Seconds 1
  }
} finally {
  if ($backendProcess -and -not $backendProcess.HasExited) {
    Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
  }
  if ($frontendProcess -and -not $frontendProcess.HasExited) {
    Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
  }
}

$global:LASTEXITCODE = 0
exit 0
