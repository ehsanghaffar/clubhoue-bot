# Room operations and AI implementation plan

> **For Codex:** Required sub-skill: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Clubhouse rooms discoverable, explicitly joinable and removable, and expose room-level controls and AI analysis in the dashboard.

**Architecture:** Keep platform discovery in the Clubhouse adapter, room lifecycle/timers in `BotManager`, and HTTP concerns in the rooms controller. The frontend consumes typed API-client methods and keeps discovery, lifecycle, settings, transcript and analysis together on the room pages.

1. Add room discovery, update/delete and room-analysis API contracts and validation.
2. Change the manager lifecycle so configured rooms never auto-join; joining explicitly activates ping/sync and leaving tears them down.
3. Add adapter feed mapping and bounded room-transcript AI summary/Q&A.
4. Extend the dashboard API client and pages for discovery, explicit join/leave/delete, independent welcome/AI controls, and AI analysis.
5. Add focused tests and run the Turborepo quality checks.
