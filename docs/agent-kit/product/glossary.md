# Glossary (ubiquitous language)

> **Rule (NAME-2):** use these exact terms in code, database, URLs and UI copy. One concept = one word. Add a term here **before** using it in code. The rows below are examples; replace them with the product's real domain.

| Term | Definition | Code name | DB table | URL | UI label (en / es) |
|---|---|---|---|---|---|
| User | A person with an account | `User` | `users` | — | User / Usuario |
| Project | A workspace a user creates to organize their work (example) | `Project` | `projects` | `/projects` | Project / Proyecto |
| Owner | The user who created a project and has full control (example) | `ownerId` | `projects.owner_id` | — | Owner / Propietario |
| Archive | Hide a project from the active list without deleting it (example) | `archiveProject` | `projects.status = 'archived'` | — | Archive / Archivar |

## Avoided synonyms

| Use | Don't use |
|---|---|
| Project | workspace, board, space |
| Archive | delete (when not deleting), hide, remove |
