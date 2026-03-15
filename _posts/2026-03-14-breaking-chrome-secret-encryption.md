---
layout: post
title: "Breaking Chrome Secret Encryption on Windows (DPAPI + AES-GCM)"
date: 2026-03-14 10:00:00 +0700
categories: [Security, Malware, Windows]
---

## Background

Google Chrome stores sensitive data such as passwords, cookies, and session tokens. To protect this information, Chrome encrypts secrets using **AES-256-GCM**, while the encryption key itself is protected by **Windows DPAPI**.

This layered design is intended to prevent other applications from accessing user secrets.

However, many information-stealing malware families are still able to extract and decrypt this data in seconds.

In this article, we will analyze how Chrome protects its secrets and demonstrate how the encryption can be reversed to steal stored credentials.

## Chrome Secret Encryption Mechanism on Windows

Chrome Secret Encryption on Windows

On Windows systems, Google Chrome does not store sensitive data such as cookies and passwords in plaintext. Instead, it uses a layered protection mechanism that combines SQLite storage, AES encryption, and Windows DPAPI.

Understanding this mechanism is essential to see why credential stealing malware is still able to steal user secrets.

1. Where Chrome Stores Sensitive Data

Chrome stores user data inside the user profile directory:

%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Default\

Several SQLite databases contain sensitive information:

| File | Content |
|------|---------|
| `Login Data` | Saved website passwords |
| `Cookies` | HTTP cookies and session tokens |
| `Web Data` | Autofill information |
| `History` | Browsing history |

Although these databases can be opened with any SQLite viewer, the sensitive fields are encrypted.

For example:

logins.password_value

cookies.encrypted_value

These values contain encrypted blobs instead of plaintext credentials.

## Chrome Master Key Storage

While Chrome stores encrypted secrets inside SQLite databases, the actual encryption key is not stored in those databases.

Instead, Chrome generates a master encryption key and stores it inside the Local State configuration file.

Location:
```php
%USERPROFILE%\AppData\Local\Google\Chrome\User Data\Local State
```
The file is a JSON document containing browser configuration data. Inside this file, Chrome stores an entry called:

os_crypt.app_bound_encrypted_key

```json
Example:

"os_crypt": {
  "app_bound_encrypted_key": "APPB..."
}
```

### Windows DPAPI and AppBound Protection

The `app_bound_encrypted_key` value stored in the **Local State** file is Base64-encoded and protected using Chrome’s AppBound encryption mechanism.

AppBound encryption is designed to bind the protection of sensitive keys to the local system and user context. Internally, this mechanism relies on Windows cryptographic services, including the **Windows Data Protection API (DPAPI)** and the **Windows Cryptography API: Next Generation (CNG)**.

The protection workflow can be summarized as follows:

1. Chrome generates a random **AES-256 master key** used to encrypt browser secrets.
2. The key is protected using **AppBound encryption**, which leverages Windows cryptographic services.
3. The protected key is stored inside the **Local State** configuration file as `os_crypt.app_bound_encrypted_key`.

When Chrome starts, it must recover this master key before it can decrypt stored secrets such as cookies or saved passwords. To do this, Chrome invokes Windows cryptographic APIs (such as `CryptUnprotectData()` and CNG routines) to unwrap the protected key and restore the original AES-256 key in memory.

Simplified flow:
```bash
Cookie / Password
        │
        ▼
AES-256-GCM
        │
        ▼
AES Master Key
        │
        ▼
AppBound Encryption
        │
        ▼
ChromeKey1
        │
        ▼
Windows Crypto System
```


Because DPAPI ties encryption to the current Windows user, the key can only be decrypted by processes running under the same user context.
However, malware running on the victim's machine automatically inherits this context, allowing it to recover the key as well.
Chrome Encrypted Secret Format. After recovering the AES key, Chrome can decrypt secrets stored in the SQLite databases.

Modern Chrome versions store encrypted secrets using the following structure:
```php
v20 | nonce | ciphertext | tag
```
Component breakdown:

| Component | Description |
|------|---------|
| `v20` | Encryption version identifier |
| `nonce` | 12-byte random initialization vector |
| `ciphertext` | Encrypted secret |
| `tag` | 16-byte authentication tag |

Chrome uses AES-256-GCM for encryption. AES-GCM provides two critical properties:
Confidentiality – the secret cannot be read without the key
Integrity – any modification to the ciphertext causes decryption to fail
To decrypt a secret, the following inputs are required:
```php
SQLite → extract encrypted_value
Local State → extract app_bound_encrypted_key
DPAPI → recover AES key
AES-GCM → decrypt secret
```
Once these values are extracted, the secret can be decrypted using a standard AES-GCM implementation.
