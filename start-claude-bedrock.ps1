param(
  [switch]$Check
)

$ErrorActionPreference = "Stop"

$configFile = Join-Path $PSScriptRoot "claude-bedrock.local.env"

function Set-EnvFromFile {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    return
  }

  Get-Content -LiteralPath $Path | ForEach-Object {
    $line = $_.Trim()

    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    $separatorIndex = $line.IndexOf("=")
    if ($separatorIndex -lt 1) {
      return
    }

    $name = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim()

    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($name -and $value) {
      [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
  }
}

function Convert-ToBedrockInferenceProfileId {
  param([string]$ModelId)

  if (-not $ModelId) {
    return $ModelId
  }

  if ($ModelId -match "^anthropic\.claude-.*-v\d+:\d+$") {
    return "us.$ModelId"
  }

  return $ModelId
}

function Update-ClaudeSettingsModel {
  param([string]$ModelId)

  $settingsPath = Join-Path $env:USERPROFILE ".claude\settings.json"
  if (-not (Test-Path -LiteralPath $settingsPath)) {
    return
  }

  try {
    $settings = Get-Content -Raw -LiteralPath $settingsPath | ConvertFrom-Json
    $normalizedModelId = Convert-ToBedrockInferenceProfileId -ModelId $settings.model

    if ($settings.model -and $settings.model -ne $normalizedModelId) {
      $settings.model = $normalizedModelId
      $settings | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $settingsPath -Encoding UTF8
      Write-Host "Claude settings model ajustado para inference profile: $normalizedModelId" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "Aviso: nao foi possivel validar $settingsPath. $_" -ForegroundColor Yellow
  }
}

Set-EnvFromFile -Path $configFile

$env:CLAUDE_CODE_USE_BEDROCK = "1"
$env:AWS_REGION = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-1" }
$env:ANTHROPIC_MODEL = Convert-ToBedrockInferenceProfileId -ModelId $env:ANTHROPIC_MODEL
$env:ANTHROPIC_SMALL_FAST_MODEL = Convert-ToBedrockInferenceProfileId -ModelId $env:ANTHROPIC_SMALL_FAST_MODEL
Update-ClaudeSettingsModel -ModelId $env:ANTHROPIC_MODEL

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw "Claude Code nao foi encontrado no PATH. Instale/atualize o Claude Code e rode este script novamente."
}

if (-not $env:AWS_BEARER_TOKEN_BEDROCK -and -not $env:AWS_PROFILE -and -not $env:AWS_ACCESS_KEY_ID) {
  $secureToken = Read-Host "Cole sua NOVA Bedrock API key" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $env:AWS_BEARER_TOKEN_BEDROCK = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

Write-Host "Claude Code via Amazon Bedrock" -ForegroundColor Cyan
Write-Host "Region: $($env:AWS_REGION)" -ForegroundColor DarkCyan
if ($env:AWS_PROFILE) {
  Write-Host "AWS profile: $($env:AWS_PROFILE)" -ForegroundColor DarkCyan
}
if ($env:ANTHROPIC_MODEL) {
  Write-Host "Model: $($env:ANTHROPIC_MODEL)" -ForegroundColor DarkCyan
}

if ($Check) {
  Write-Host "Configuracao Bedrock pronta para iniciar o Claude Code." -ForegroundColor Green
  exit 0
}

claude
