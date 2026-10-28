# Migrations

Apply `../schema.sql` for the initial `UniversityAdminClone` schema.

Future incremental scripts can be added here as:

```text
001_add_column_example.sql
002_...
```

Always run migrations only against the **clone** database, never production MGKVP.
