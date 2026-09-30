import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const output = await mkdtemp(join(tmpdir(), "interview-vision-tests-"));
const tests = [
  "calibration",
  "visionTracking",
  "visionScreens",
  "interviewFinalizer",
  "audioApi",
];
try {
  await build({
    entryPoints: tests.map(
      (name) => `tests/${name}.test.${name === "visionScreens" ? "tsx" : "ts"}`,
    ),
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    define: {
      "import.meta.env.VITE_AUDIO_API_BASE_URL": JSON.stringify(""),
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
        "https://backend.example",
      ),
    },
    outdir: output,
    outExtension: { ".js": ".cjs" },
    logLevel: "warning",
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ...tests.map((name) => join(output, `${name}.test.cjs`))],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
