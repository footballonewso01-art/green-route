param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("greenroute-pb", "greenroute-pb-staging")]
    [string]$App
)

# First-time setup only. Never rotates a deployed encryption key. The secret
# travels to Fly via stdin, never argv, output, source files or shell history.
$ErrorActionPreference = "Stop"
if ($PSVersionTable.PSVersion.Major -lt 7) { throw "PowerShell 7 is required." }
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$remote = & flyctl secrets list --json -a $App
if ($LASTEXITCODE -ne 0) { throw "Unable to inspect Fly secrets." }
$secrets = $remote | ConvertFrom-Json
if (@($secrets | Where-Object { $_.Name -eq "PB_ENCRYPTION_KEY" }).Count -gt 0) {
    throw "PB_ENCRYPTION_KEY already exists on Fly. Refusing to replace it."
}

Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class LinkteryCredentialVault {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct Credential {
        public uint Flags, Type;
        public string TargetName, Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public uint CredentialBlobSize;
        public IntPtr CredentialBlob;
        public uint Persist, AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias, UserName;
    }
    [DllImport("advapi32.dll", EntryPoint="CredWriteW", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool CredWrite(ref Credential credential, uint flags);
    [DllImport("advapi32.dll", EntryPoint="CredReadW", CharSet=CharSet.Unicode, SetLastError=true)]
    private static extern bool CredRead(string target, uint type, uint flags, out IntPtr credential);
    [DllImport("advapi32.dll")]
    private static extern void CredFree(IntPtr credential);
    public static string Read(string target) {
        IntPtr pointer;
        if (!CredRead(target, 1, 0, out pointer)) {
            int error = Marshal.GetLastWin32Error();
            if (error == 1168) return null;
            throw new Win32Exception(error);
        }
        try {
            var value = Marshal.PtrToStructure<Credential>(pointer);
            return Marshal.PtrToStringUni(value.CredentialBlob, (int)value.CredentialBlobSize / 2);
        } finally { CredFree(pointer); }
    }
    public static void Write(string target, string value) {
        IntPtr pointer = Marshal.StringToHGlobalUni(value);
        try {
            var credential = new Credential {
                Type=1, TargetName=target, UserName="PB_ENCRYPTION_KEY",
                Comment="Linktery PocketBase settings encryption recovery key",
                CredentialBlob=pointer, CredentialBlobSize=(uint)Encoding.Unicode.GetByteCount(value), Persist=2
            };
            if (!CredWrite(ref credential, 0)) throw new Win32Exception(Marshal.GetLastWin32Error());
        } finally { Marshal.ZeroFreeGlobalAllocUnicode(pointer); }
    }
}
'@

$target = "Linktery/Fly/$App/PB_ENCRYPTION_KEY"
$key = [LinkteryCredentialVault]::Read($target)
if (-not $key) {
    $key = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(16)).ToLowerInvariant()
    [LinkteryCredentialVault]::Write($target, $key)
}
if ($key.Length -ne 32 -or [LinkteryCredentialVault]::Read($target) -cne $key) {
    throw "Credential Manager backup verification failed."
}

$directory = Join-Path $root ".local-security-artifacts\deployment-secrets"
New-Item -ItemType Directory -Path $directory -Force | Out-Null
$archive = Join-Path $directory "$App.PB_ENCRYPTION_KEY.dpapi"
$entropy = [Text.Encoding]::UTF8.GetBytes($target)
$bytes = [Text.Encoding]::UTF8.GetBytes($key)
if (Test-Path -LiteralPath $archive) {
    $restored = [Security.Cryptography.ProtectedData]::Unprotect(
        [IO.File]::ReadAllBytes($archive), $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    if (-not [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($bytes, $restored)) {
        throw "Existing encrypted backup does not match the credential vault."
    }
} else {
    $encrypted = [Security.Cryptography.ProtectedData]::Protect(
        $bytes, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [IO.File]::WriteAllBytes($archive, $encrypted)
    $restored = [Security.Cryptography.ProtectedData]::Unprotect(
        [IO.File]::ReadAllBytes($archive), $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    if (-not [Security.Cryptography.CryptographicOperations]::FixedTimeEquals($bytes, $restored)) {
        throw "Encrypted backup verification failed."
    }
}

("PB_ENCRYPTION_KEY=" + $key) | & flyctl secrets import --stage -a $App
if ($LASTEXITCODE -ne 0) { throw "Fly secret staging failed. Local backups were preserved for retry." }
Write-Output "Staged PB_ENCRYPTION_KEY for $App. Verified Windows Credential Manager and DPAPI backups; existing machines were not restarted."
$key = $null
[Security.Cryptography.CryptographicOperations]::ZeroMemory($bytes)
[Security.Cryptography.CryptographicOperations]::ZeroMemory($restored)
