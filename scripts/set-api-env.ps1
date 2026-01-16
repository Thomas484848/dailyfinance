param(
  [string]$ApiBaseUrl,
  [string]$Email,
  [string]$Password,
  [string]$EnvPath = ".env.local"
)

if (-not $ApiBaseUrl) {
  $ApiBaseUrl = Read-Host "API base URL (ex: http://192.168.1.30:8000)"
}
if (-not $Email) {
  $Email = Read-Host "API login email"
}
if (-not $Password) {
  $secure = Read-Host "API login password" -AsSecureString
  $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  )
}

$loginUrl = ($ApiBaseUrl.TrimEnd('/') + "/api/login")
$body = @{ email = $Email; password = $Password } | ConvertTo-Json

try {
  $response = Invoke-RestMethod -Method Post -Uri $loginUrl -Body $body -ContentType "application/json"
} catch {
  Write-Error "Login failed: $($_.Exception.Message)"
  exit 1
}

if (-not $response.token) {
  Write-Error "No token returned from API."
  exit 1
}

$token = $response.token

$lines = @()
if (Test-Path $EnvPath) {
  $lines = Get-Content $EnvPath
}

$lines = $lines | Where-Object { $_ -notmatch '^NEXT_PUBLIC_API_BASE_URL=' -and $_ -notmatch '^NEXT_PUBLIC_API_TOKEN=' }
$lines += "NEXT_PUBLIC_API_BASE_URL=$ApiBaseUrl"
$lines += "NEXT_PUBLIC_API_TOKEN=$token"

$lines | Set-Content -Path $EnvPath -Encoding ASCII
Write-Host "Updated $EnvPath with API base URL and token."
