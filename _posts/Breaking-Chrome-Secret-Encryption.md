---
layout: post
title: "Breaking Chrome Secret Encryption (DPAPI + AES-GCM)"
date: 2026-03-14 10:00:00 +0700
categories: [Security, Malware, Windows]
---

## Background

Google Chrome không lưu password plaintext.

Secrets được encrypt bằng **AES-256-GCM** và key AES được bảo vệ bằng **DPAPI**.

## Step 1 — Extract AppBoundKey

Key AES được lưu trong file:
