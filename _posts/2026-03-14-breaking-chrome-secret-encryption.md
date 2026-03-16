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


### Chrome Secret Decryption Flow


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