import fs from "fs";
import path from "path";

function parseEnvFile(contents: string) {
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

export function loadWorkspaceEnv() {
  const envPath = path.resolve(__dirname, "../../../artifacts/api-server/.env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  parseEnvFile(fs.readFileSync(envPath, "utf8"));
}
