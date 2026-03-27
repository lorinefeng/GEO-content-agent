# Aliyun Migration Placeholder

This directory is a staging area for moving the current Cloudflare D1 data model to an Aliyun-hosted relational database later.

## Recommended migration order

1. Export D1 from production:
   - `npm run d1:export:remote`
2. Freeze target schema changes for the migration window.
3. Adapt the SQL schema in `mysql-schema.placeholder.sql` to the selected Aliyun engine:
   - ApsaraDB RDS for MySQL
   - PolarDB for MySQL
4. Build an importer that maps D1 SQL / JSON rows into the target database.
5. Switch the application data-access layer from direct D1 calls to a repository backed by the new engine.

## What is already prepared

- Remote D1 export script
- Internal service API separated from page-session auth
- Clear table inventory in the placeholder schema file

## What is intentionally not finalized yet

- Final Aliyun engine selection
- Final SQL dialect details
- Data cutover procedure
- Incremental sync / dual-write plan
