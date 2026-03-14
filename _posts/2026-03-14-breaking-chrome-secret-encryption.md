---
layout: post
title: "Breaking Chrome Secret Encryption (DPAPI + AES-GCM)"
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

os_crypt.encrypted_key

```json
Example:

"os_crypt": {
  "encrypted_key": "RFBBUEkAAAA..."
}
```

This value is:
Base64 encoded
Protected using Windows DPAPI
Before Chrome can decrypt cookies or passwords, it must first recover this master key.
Windows DPAPI Protection
Chrome relies on the Windows Data Protection API (DPAPI) to protect the master key.
DPAPI is a Windows cryptographic service designed to protect sensitive data tied to a specific user account.
The protection workflow looks like this:
Chrome generates a random AES-256 key
The key is encrypted using DPAPI
The encrypted key is stored in Local State
When Chrome starts, it calls CryptUnprotectData() to recover the original key

Simplified flow:
```bash
AES Master Key
      │
      ▼
DPAPI Encrypt
      │
      ▼
Stored in Local State

When Chrome needs to decrypt secrets:

Encrypted Key (Local State)
        │
        ▼
CryptUnprotectData()
        │
        ▼
Recovered AES Key
```


Because DPAPI ties encryption to the current Windows user, the key can only be decrypted by processes running under the same user context.
However, malware running on the victim's machine automatically inherits this context, allowing it to recover the key as well.
Chrome Encrypted Secret Format. After recovering the AES key, Chrome can decrypt secrets stored in the SQLite databases.

Modern Chrome versions store encrypted secrets using the following structure:
```php
v20 | nonce | ciphertext | tag
```
Component breakdown:

Component	Description
v20	Encryption version identifier
nonce	12-byte random initialization vector
ciphertext	Encrypted secret
tag	16-byte authentication tag

Chrome uses AES-256-GCM for encryption. AES-GCM provides two critical properties:
Confidentiality – the secret cannot be read without the key
Integrity – any modification to the ciphertext causes decryption to fail
To decrypt a secret, the following inputs are required:

- AES master key
- nonce
- ciphertext
- authentication tag

Once these values are extracted, the secret can be decrypted using a standard AES-GCM implementation.
