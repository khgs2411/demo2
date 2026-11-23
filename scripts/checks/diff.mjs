import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

export function readBaseFile(base, path) {
  if (!git("--literal-pathspecs", "ls-tree", base, "--", path)) return undefined;
  return git("show", base + ":" + path);
}

export function readDiff() {
  process.chdir(git("rev-parse", "--show-toplevel").trim());
  const base = git("merge-base", "master", "HEAD").trim();
  const tracked = new Set(git("diff", "--no-renames", "--name-only", "-z", base, "--").split("\0").filter(Boolean));
  const untracked = git("ls-files", "--others", "--exclude-standard", "-z").split("\0").filter(Boolean);
  const files = [...new Set([...tracked, ...untracked])].map(path => {
    const added = [];
    const changes = [];
    const args = ["diff", "--no-color", "--no-ext-diff", "--no-textconv", "--unified=0"];
    let patch;
    if (tracked.has(path)) {
      patch = git("--literal-pathspecs", ...args, base, "--", path);
    } else {
      try {
        patch = git(...args, "--no-index", "--", "/dev/null", path);
      } catch (error) {
        if (error.status !== 1 || /^error:/m.test(error.stderr) || !error.stdout?.trim()) throw error;
        patch = error.stdout;
      }
    }
    let newLine;
    for (const line of patch.split("\n")) {
      const hunk = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (hunk) {
        newLine = Number(hunk[2]);
        changes.push({ first: newLine, length: Number(hunk[3] ?? 1) });
      } else if (newLine !== undefined && line.startsWith("+")) {
        added.push({ line: newLine++, text: line.slice(1) });
      }
    }
    return { path, added, changes, deleted: !existsSync(path) };
  });
  return { base, files };
}
