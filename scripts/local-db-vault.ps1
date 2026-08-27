param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("Protect", "Unprotect")]
    [string]$Mode,

    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [string]$OutputPath,

    [switch]$RemoveSource
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$source = (Resolve-Path -LiteralPath $InputPath).Path
if (-not $source.StartsWith($root + [IO.Path]::DirectorySeparatorChar)) {
    throw "Input must stay inside the Linktery workspace."
}

if (-not $OutputPath) {
    if ($Mode -eq "Protect") {
        $vault = Join-Path $root ".local-security-artifacts\encrypted-databases"
        $OutputPath = Join-Path $vault ((Split-Path $source -Leaf) + ".dpapi")
    } else {
        throw "OutputPath is required when decrypting a database."
    }
}

$destination = if ([IO.Path]::IsPathRooted($OutputPath)) {
    [IO.Path]::GetFullPath($OutputPath)
} else {
    [IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
}
if (-not $destination.StartsWith($root + [IO.Path]::DirectorySeparatorChar)) {
    throw "Output must stay inside the Linktery workspace."
}
if (Test-Path -LiteralPath $destination) {
    throw "Refusing to overwrite existing output: $destination"
}

$destinationDirectory = Split-Path $destination -Parent
New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
$entropy = [Text.Encoding]::UTF8.GetBytes("LinkteryLocalDatabaseVaultV1")
$inputBytes = [IO.File]::ReadAllBytes($source)

if ($Mode -eq "Protect") {
    $outputBytes = [Security.Cryptography.ProtectedData]::Protect(
        $inputBytes,
        $entropy,
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $roundTrip = [Security.Cryptography.ProtectedData]::Unprotect(
        $outputBytes,
        $entropy,
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    if (-not [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($inputBytes, $roundTrip)) {
        throw "Encrypted archive verification failed."
    }
} else {
    $outputBytes = [Security.Cryptography.ProtectedData]::Unprotect(
        $inputBytes,
        $entropy,
        [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
}

$temporary = $destination + ".tmp"
[IO.File]::WriteAllBytes($temporary, $outputBytes)
Move-Item -LiteralPath $temporary -Destination $destination

if ($RemoveSource) {
    Remove-Item -LiteralPath $source -Force
}

Write-Output $destination
