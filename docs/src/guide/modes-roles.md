---
{ 'home': True, 'prev': False, 'next': False }
---

# Document Modes and Roles

SuperDoc supports different document modes and user roles to control editing capabilities:

### Document Modes

- **editing** - Full document editing capabilities
- **viewing** - Read-only mode with no editing allowed
- **suggesting** - Track changes mode where edits are shown as suggestions

### User Roles

- **editor** - Users with full editing capabilities who can access all document modes
- **suggester** - Users who can only make suggestions (track changes) but cannot directly edit
- **viewer** - Users with read-only access who can only view the document

The user's role restricts which document modes they can access. For example, a user with the "viewer" role will always be in viewing mode regardless of the requested document mode.

## Next

- See [Project Structure](/guide/project-structure)
