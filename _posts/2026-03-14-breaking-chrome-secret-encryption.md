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

## Step 1 — Extract AppBoundKey

Key AES được lưu trong file:
