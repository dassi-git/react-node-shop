# System Specification & Decisions

## Technical Stack
* Frontend: Angular 17.
* Backend: Django (Python 3.11).
* Database: PostgreSQL 15.

## Database Changes (Update: 2026-04-15)
* Added 'status' field to the 'Tasks' table.
* Removed 'obsolete_id' from 'Users' table to clean up legacy data.
* Constraint added: All email fields must be unique and lowercase.

## Constraints
* The system must handle up to 5,000 concurrent users.
* File upload limit is set to 15MB.