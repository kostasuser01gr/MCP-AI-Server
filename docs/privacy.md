# Privacy Policy

**Effective Date:** 19 February 2026
**Application:** MCP AI Server - Fleet Management Workspace

---

## 1. Overview

MCP AI Server is an internal enterprise application used to manage fleet operations through authenticated Model Context Protocol tools. It provides authorised personnel with tools for vehicle tracking, maintenance logging, wash scheduling, sales recording, and operational reporting.

This application is a business-to-business (B2B) internal tool. It is not a consumer-facing product and does not interact with or collect data from the general public.

---

## 2. Data Collected

The application processes **fleet operational data only**, including:

- Vehicle records (plate numbers, make, model, category, status, location)
- Wash and maintenance logs (timestamps, employee identifiers)
- Sales transaction records (amounts, timestamps, vehicle references)
- Operational reports and daily summaries

**The application does not collect:**

- Personal customer data (names, emails, phone numbers, addresses)
- Payment card or financial account information
- Biometric or health data
- Location tracking of individuals
- Browser cookies, device fingerprints, or analytics identifiers

---

## 3. Data Usage

All data processed by the application is used exclusively for:

- Managing the operational status of fleet vehicles
- Recording business transactions for internal accounting
- Generating operational reports for management review
- Supporting internal knowledge search across company policies

Data is never sold, shared with third parties for marketing purposes, or used for profiling individuals.

---

## 4. Data Storage and Security

- **Local storage:** All data is stored in a local SQLite database within company-controlled infrastructure. No data is transmitted to external cloud databases.
- **Access control:** The application enforces API key authentication. Only authorised personnel with valid credentials can access the system.
- **Transport security:** When exposed beyond the local network, all traffic is encrypted via HTTPS (TLS).
- **Audit logging:** The application maintains an internal audit log of operations performed through its interface.
- **No data replication:** Data is not replicated to third-party services or external backups unless explicitly configured by the system administrator.

---

## 5. Third-Party Services

The application does not integrate with:

- Advertising networks
- Analytics or tracking platforms
- Social media services
- Third-party data brokers

When the application is registered as an MCP server with an external platform, the platform may send tool invocation requests to the server. These requests are processed in real time and responses contain only the requested fleet operational data. No persistent data sharing occurs beyond the scope of each individual request.

---

## 6. User Rights

As this application handles internal business data rather than personal consumer data, traditional data subject rights (access, rectification, erasure) apply to employee-related identifiers stored in logs.

Authorised personnel may:

- Request a summary of data associated with their employee identifier
- Request correction of inaccurate records
- Request deletion of records where operationally permissible

All such requests should be directed to the system administrator (see Contact Information below).

---

## 7. Contact Information

For questions regarding this privacy policy or data handling practices, contact the system administrator responsible for this deployment:

- **Email:** admin@yourcompany.com
- **Internal channel:** As designated by your organisation

---

## Changes to This Policy

This policy may be updated to reflect changes in application functionality or regulatory requirements. The effective date at the top of this document indicates the most recent revision.
