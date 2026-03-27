#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(cwd, 'backups', 'd1', timestamp);
fs.mkdirSync(outDir, { recursive: true });

const configPath = path.resolve(cwd, 'wrangler.toml');
const fullSql = path.join(outDir, 'geo-db.full.sql');
const schemaSql = path.join(outDir, 'geo-db.schema.sql');
const dataSql = path.join(outDir, 'geo-db.data.sql');

const run = (args) => {
  const result = spawnSync('npx', ['wrangler', 'd1', 'export', 'geo-db', '--remote', '--config', configPath, ...args], {
    cwd,
    stdio: 'inherit',
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
};

run(['--output', fullSql]);
run(['--output', schemaSql, '--no-data']);
run(['--output', dataSql, '--no-schema']);

console.log(`export_dir=${outDir}`);
console.log(`full=${fullSql}`);
console.log(`schema=${schemaSql}`);
console.log(`data=${dataSql}`);
