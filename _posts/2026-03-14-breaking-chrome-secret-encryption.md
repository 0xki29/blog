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


