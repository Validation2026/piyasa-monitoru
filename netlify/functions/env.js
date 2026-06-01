const fs = require('fs');
const path = require('path');

let loaded = false;
let source = null;

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eq = trimmed.indexOf('=');
  if (eq <= 0) return null;

  const key = trimmed.slice(0, eq).trim();
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  let value = trimmed.slice(eq + 1).trim();
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    value = value.slice(1, -1);
    if (quote === '"') {
      value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t');
    }
  } else {
    const hash = value.search(/\s#/);
    if (hash >= 0) value = value.slice(0, hash).trim();
  }

  return { key, value };
}

function candidatePaths() {
  const paths = [];
  let dir = process.cwd();
  for (let i = 0; i < 6 && dir && dir !== path.dirname(dir); i++) {
    paths.push(path.join(dir, '.env'));
    dir = path.dirname(dir);
  }
  paths.push(path.resolve(__dirname, '..', '..', '.env'));
  return [...new Set(paths)];
}

function loadEnv() {
  if (loaded) return { source };
  loaded = true;

  for (const file of candidatePaths()) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const parsed = parseEnvLine(line);
      if (parsed && process.env[parsed.key] == null) process.env[parsed.key] = parsed.value;
    });
    source = file;
    break;
  }

  return { source };
}

module.exports = { loadEnv, parseEnvLine };
