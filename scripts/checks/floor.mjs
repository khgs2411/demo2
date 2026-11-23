import { existsSync, readFileSync } from "node:fs";
import { git, readBaseFile, readDiff } from "./diff.mjs";

const isTest = path => /^src\/.+\.test\.tsx?$/.test(path);
const jsOrTs = /\.[cm]?[jt]sx?$/;
const sourceOrConfig = /\.(?:css|html|sh|jsonc?|toml|ya?ml|gitignore)$/;
const commentStart = /\/\/|\/\*|^\s*\*|(?:^|\s)#|<!--/;
const suppressionComment = String.raw`(?:${commentStart.source}).*?`;
const suppression = new RegExp(String.raw`${suppressionComment}(?:@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable|v8\s+ignore|istanbul\s+ignore|gitleaks:allow)`);
const unfinished = /throw\s+new\s+Error\s*\(\s*["'`]not implemented\b|\bcatch\s*(?:\([^)]*\)\s*)?\{\s*\}/gi;
const placeholder = new RegExp(String.raw`(?:${commentStart.source})\s*TODO\b`, "i");
const measuredSection = "Measured, not yet enforced";
const exceptionsSection = "Exceptions";
const exceptionKey = key => key.startsWith(exceptionsSection + "/");

const protectedScripts = {
  "package.json": ["check", "check:floor", "test", "build"],
};
const gitleaksConfigs = [".gitleaks.toml", ".gitleaksignore"];
const protectedConfigs = new Set([
  "src/test-setup.ts",
  "tsconfig.json",
  "vite.config.ts",
  "vitest.config.ts",
]);

function checkFloorMechanism(base, files, flag) {
  for (const path of gitleaksConfigs) {
    // Gitleaks also reads these files when Git ignores them.
    if (files.some(file => file.path === path) ||
        (existsSync(path) && readBaseFile(base, path) === undefined)) {
      flag(path, "changed Gitleaks configuration");
    }
  }

  for (const { path, deleted } of files) {
    if (Object.hasOwn(protectedScripts, path)) {
      const previousScripts = JSON.parse(readBaseFile(base, path) ?? "{}").scripts ?? {};
      const currentScripts = deleted ? {} : JSON.parse(readFileSync(path, "utf8")).scripts ?? {};
      for (const name of protectedScripts[path]) {
        if (Object.hasOwn(previousScripts, name) && currentScripts[name] !== previousScripts[name]) {
          flag(path, "changed floor script (" + name + ")");
        }
      }
    }

    const isChecker = path.startsWith("scripts/checks/");
    if ((isChecker || protectedConfigs.has(path)) && readBaseFile(base, path) !== undefined) {
      flag(path, isChecker ? "changed floor checker" : "changed floor configuration");
    }
  }
}

function rules(markdown, flagDuplicate) {
  const keys = new Map();
  const exceptionProse = [];
  const add = (key, rule) => {
    if (keys.has(key)) {
      flagDuplicate(key);
      return;
    }
    keys.set(key, rule);
  };

  let section = "";
  for (const text of markdown.split("\n")) {
    if (text.startsWith("## ")) {
      section = text.slice(3);
      continue;
    }
    const row = /^\|\s*([^|]+?)\s*\|/.exec(text);
    if (section === exceptionsSection && !row) exceptionProse.push(text);
    if (row && !/^(Dimension|Metric|ID|[-: ]+)$/.test(row[1])) {
      const measured = section === measuredSection;
      const direction = measured ? text.split(/(?<!\\)\|/)[3]?.trim() : undefined;
      add(`${section}/${row[1]}`, { text: direction ?? text, measured });
    } else if (text.startsWith("- ") && section.startsWith("Floor")) {
      add(text.split(":")[0], { text });
    }
  }
  return { keys, exceptionProse: exceptionProse.join("\n") };
}

function tightens(before, after) {
  if (before.replace(/warn until \d{4}-\d{2}-\d{2}, then block(?=\s*\|$)/, "block") === after) return true;
  const minimum = /([≥>]\s*)(\d+(?:\.\d+)?)%/;
  const old = minimum.exec(before);
  const next = minimum.exec(after);
  return old && next && before.replace(minimum, "$1%") === after.replace(minimum, "$1%") &&
    Number(next[2]) > Number(old[2]);
}

function intersectsChanges(changes, { first, last }) {
  return changes.some(change => change.length
    ? change.first <= last && change.first + change.length > first
    : first <= change.first && change.first < last);
}

function changedMatches(content, pattern, changes) {
  return Array.from(content.matchAll(pattern), match => {
    const first = content.slice(0, match.index).split("\n").length;
    const last = first + match[0].split("\n").length - 1;
    return { text: match[0], first, last };
  }).filter(range => intersectsChanges(changes, range));
}

try {
  let violations = 0;
  const flag = (path, rule, line) => {
    console.error(`floor: ${path}${line ? ":" + line : ""}: ${rule}`);
    violations++;
  };

  const { base, files } = readDiff();
  checkFloorMechanism(base, files, flag);
  const { readTestSyntax } = await import("./test-syntax.mjs");
  const trailers = git("log", "--no-show-signature",
    "--format=%(trailers:key=Test-Skip-Reason,valueonly,unfold)", `${base}..HEAD`);
  const testsWithReasons = new Set();
  for (const value of trailers.split("\n")) {
    const match = /^(.+?):[ \t]+\S/.exec(value);
    if (match) testsWithReasons.add(match[1]);
  }

  if (testsWithReasons.size) {
    const status = git("status", "--porcelain=v1", "-z", "--no-renames", "--untracked-files=all");
    for (const entry of status.split("\0")) testsWithReasons.delete(entry.slice(3));
  }

  for (const { path, added, changes, deleted } of files) {
    if (path === "CONSTRAINTS.md") {
      const before = git("show", `${base}:${path}`);
      const after = deleted ? "" : readFileSync(path, "utf8");
      const parseRules = (markdown, side) =>
        rules(markdown, key => flag(path, `duplicate rule key in ${side} (${key})`));
      const current = parseRules(after, "working tree");
      const baseRules = parseRules(before, "merge base");
      for (const [key, { text, measured }] of baseRules.keys) {
        if (exceptionKey(key)) continue;
        const updated = current.keys.get(key)?.text;
        if (updated !== text && (measured || !updated || !tightens(text, updated))) {
          flag(path, `rule changed (${key})`);
        }
      }
      for (const [key, { text }] of current.keys) {
        if (exceptionKey(key) && text !== baseRules.keys.get(key)?.text) {
          flag(path, "changed exceptions");
        }
      }
      if (current.exceptionProse !== baseRules.exceptionProse) flag(path, "changed exceptions");
      continue;
    }

    const checkTestChanges = isTest(path) && !testsWithReasons.has(path);
    if (!deleted && jsOrTs.test(path)) {
      const content = readFileSync(path, "utf8");
      for (const { text, first } of changedMatches(content, unfinished, changes)) {
        flag(path, text.startsWith("catch") ? "empty catch" : "unfinished work", first);
      }
      if (checkTestChanges) {
        const syntax = readTestSyntax(path, content);
        for (const range of syntax.skipped) {
          if (intersectsChanges(changes, range)) {
            flag(path, "test skipped, focused or marked TODO", range.first);
          }
        }
        const before = readTestSyntax(path, readBaseFile(base, path) ?? "");
        if (syntax.declarations < before.declarations) flag(path, "test declaration removed");

        const replacements = syntax.assertions.map(entry => entry.text);
        for (const { first, text } of before.assertions) {
          const replacement = replacements.indexOf(text);
          if (replacement === -1) flag(path, "assertion removed", first);
          else replacements.splice(replacement, 1);
        }
      }
    }

    if (jsOrTs.test(path) || sourceOrConfig.test(path)) {
      for (const { text, line } of added) {
        if (suppression.test(text)) flag(path, "new suppression", line);
        if (placeholder.test(text)) flag(path, "unfinished work", line);
      }
    }
    if (checkTestChanges && deleted) flag(path, "test file removed");
  }

  if (!violations) console.log("floor: clean");
  process.exitCode = violations ? 1 : 0;
} catch (error) {
  console.error(`floor: could not check the diff (${error.message})`);
  process.exitCode = 2;
}
