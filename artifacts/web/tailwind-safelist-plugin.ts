import fs from "fs";
import path from "path";
import type { Plugin } from "vite";

const GENERATED_FILE_NAME = "tailwind-safelist.generated.css";
const SOURCE_EXTENSIONS = new Set([".html", ".ts", ".tsx"]);
const SIMPLE_TOKENS = new Set([
  "absolute",
  "block",
  "border",
  "container",
  "fixed",
  "flex",
  "grid",
  "group",
  "hidden",
  "inline",
  "inline-block",
  "inline-flex",
  "italic",
  "peer",
  "relative",
  "sr-only",
  "sticky",
  "table",
  "underline",
]);

const TOKEN_PATTERN = /[!@A-Za-z0-9_:%./\-[\]()+#,~&>=]+/g;

function shouldIncludeToken(token: string) {
  if (!token || token.length > 200) {
    return false;
  }

  if (
    token.startsWith("@") ||
    token.startsWith("./") ||
    token.startsWith("../") ||
    token.startsWith("/") ||
    token.startsWith("http") ||
    token.startsWith("data:") ||
    token.startsWith("import") ||
    token.startsWith("export") ||
    token.startsWith("from") ||
    token.startsWith("function") ||
    token.startsWith("return") ||
    token.startsWith("const") ||
    token.startsWith("let") ||
    token.startsWith("var") ||
    token.startsWith("type") ||
    token.startsWith("interface")
  ) {
    return false;
  }

  if (
    token.includes("${") ||
    token.includes("}") ||
    token.includes("{") ||
    token.includes(";") ||
    token.includes("\\") ||
    token.endsWith(":")
  ) {
    return false;
  }

  if (
    token.includes(".tsx") ||
    token.includes(".ts") ||
    token.includes(".css") ||
    token.includes(".png") ||
    token.includes(".jpg") ||
    token.includes(".jpeg") ||
    token.includes(".svg") ||
    token.includes(".gif") ||
    token.includes(".webp") ||
    token.includes(".ico")
  ) {
    return false;
  }

  return (
    SIMPLE_TOKENS.has(token) ||
    token.includes("-") ||
    token.includes(":") ||
    token.includes("[") ||
    token.includes("]") ||
    token.includes("/")
  );
}

function collectSourceFiles(rootDir: string, currentDir: string, files: string[]) {
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git" ||
      entry.name === GENERATED_FILE_NAME
    ) {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      collectSourceFiles(rootDir, fullPath, files);
      continue;
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push(path.relative(rootDir, fullPath));
  }
}

function generateTailwindSafelist(rootDir: string) {
  const srcDir = path.join(rootDir, "src");
  const generatedFilePath = path.join(srcDir, GENERATED_FILE_NAME);
  const files: string[] = [];

  const indexHtmlPath = path.join(rootDir, "index.html");
  if (fs.existsSync(indexHtmlPath)) {
    files.push("index.html");
  }

  if (fs.existsSync(srcDir)) {
    collectSourceFiles(rootDir, srcDir, files);
  }

  const tokens = new Set<string>();

  for (const relativeFilePath of files) {
    const absoluteFilePath = path.join(rootDir, relativeFilePath);
    const content = fs.readFileSync(absoluteFilePath, "utf8");
    const matches = content.match(TOKEN_PATTERN) ?? [];

    for (const token of matches) {
      if (shouldIncludeToken(token)) {
        tokens.add(token);
      }
    }
  }

  const output = `${Array.from(tokens)
    .sort((left, right) => left.localeCompare(right))
    .map((token) => `@source inline("${token}");`)
    .join("\n")}\n`;

  if (!fs.existsSync(generatedFilePath) || fs.readFileSync(generatedFilePath, "utf8") !== output) {
    fs.writeFileSync(generatedFilePath, output, "utf8");
  }
}

export function tailwindSafelistPlugin(): Plugin {
  let rootDir = "";

  return {
    name: "tailwind-safelist-generator",
    configResolved(config) {
      rootDir = config.root;
      generateTailwindSafelist(rootDir);
    },
    buildStart() {
      if (rootDir) {
        generateTailwindSafelist(rootDir);
      }
    },
    handleHotUpdate(context) {
      if (!rootDir) {
        return;
      }

      const relativePath = path.relative(rootDir, context.file);

      if (
        relativePath === "index.html" ||
        (relativePath.startsWith("src") &&
          SOURCE_EXTENSIONS.has(path.extname(relativePath)) &&
          !relativePath.endsWith(GENERATED_FILE_NAME))
      ) {
        generateTailwindSafelist(rootDir);
      }
    },
  };
}
