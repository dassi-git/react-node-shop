# Technical Debt & Warnings

## Critical Warnings
* **Sensitive Area:** The JWT Authentication hook in `auth_middleware.py` is highly sensitive. Do not modify the token validation logic without senior review.
* **Performance:** The data synchronization service is currently a bottleneck. Avoid adding heavy computations inside the main loop.

## Decisions (Update: 2026-05-01)
* It was decided to support English and Hebrew translations for all interface labels.
* Integration with a third-party SMS service is delayed until next sprint.