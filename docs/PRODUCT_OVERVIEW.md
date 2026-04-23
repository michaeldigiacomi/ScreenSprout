# Product Overview: ScreenSprout
**Organization:** Digital Adrenalin
**Version:** 2026.02.15
**Status:** Active Development

## Executive Summary
ScreenSprout is a comprehensive digital wellness platform designed to help families manage screen time, enforce healthy boundaries, and promote balanced digital habits across all devices. Unlike simple blockers, ScreenSprout offers deep OS integration (Android, Windows, Linux) and a centralized parental control dashboard, ensuring robust enforcement and seamless management.

## Core Value Proposition
*   **Unified Control:** Manage phones, tablets, and desktops from a single, intuitive dashboard.
*   **Deep Enforcement:** Native OS integration prevents easy bypasses by tech-savvy users.
*   **Flexible Management:** Granular control over app usage, scheduling, and family access.
*   **Privacy-First Architecture:** Data is processed locally where possible; usage stats are secure.

## Key Features & Capabilities

### 1. Centralized Management Dashboard (Web)
*   **Family Sharing Management:** Invite members via email, manage roles (Owner, Admin, Member), and revoke access instantly.
*   **Real-Time Status:** View active/pending invitations and total shared users.
*   **Secure Access:** Role-based access control with JWT authentication.
*   **Tech Stack:** React/Vite frontend, Node.js/Express backend.

### 2. Mobile Client (Android)
*   **Usage Tracking:** Comprehensive app usage statistics via `UsageStatsService`.
*   **Smart Blocking:** Full-screen, non-dismissible overlay via `OverlayService` for restricted apps.
*   **Tamper Resistance:** Device Admin privileges prevent unauthorized removal.
*   **Modern UI:** Built with Kotlin and Jetpack Compose for a responsive, native experience.
*   **Background Sync:** Efficient background worker ensures policies are always up-to-date.

### 3. Desktop Client (Windows & Linux)
*   **Windows Support:** Headless .NET 9 Worker Service for Windows, running as a background service.
*   **Deployment:** Runs as a Windows Service with no GUI required.
*   **Stability:** Built on .NET 9.0 (LTS) for long-term reliability and performance.
*   **Process Control:** Monitors active window handles and enforces process-level restrictions.

### 4. Enterprise-Grade Infrastructure
*   **Kubernetes Hosting:** Deployed on a private K3s cluster for high availability and scalability.
*   **CI/CD Pipelines:** Automated Gitea Actions ensure code quality (Lint, Test, Build) before deployment.
*   **Security:** Private Docker Registry with authentication; strict network policies and resource quotas.
*   **Observability:** Prometheus and Grafana integration for real-time system monitoring.

## Target Audience
*   **Parents:** Concerned about excessive gaming, social media addiction, and sleep disruption.
*   **Schools:** Managing devices during class hours to maintain focus.
*   **Self-Improvers:** Adults looking to block distractions and improve productivity.

## Roadmap & Next Steps
*   **iOS Integration:** Exploring notification mirroring via KDE Connect.
*   **Project Health Dashboard:** Automated reporting on build status and system health.
*   **Advanced Analytics:** Deeper insights into usage trends over time.
*   **Self-Reflection Skill:** AI-driven analysis of user patterns to suggest optimal schedules.
