import { spawn } from "node:child_process";

const children = [];
const REDIS_CONTAINER_NAME = "wirus-redis";
const RESET_REDIS = process.argv.includes("--reset-redis");
let shouldStopRedisOnExit = false;
let isShuttingDown = false;

function run(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  });
  children.push(child);
  return child;
}

function runCapture(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || `Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

async function ensureRedis() {
  if (RESET_REDIS) {
    console.log("[dev:local] Resetting Redis container");
    await runCapture("docker", ["rm", "-f", REDIS_CONTAINER_NAME]).catch(() => undefined);
  }

  const { stdout } = await runCapture("docker", ["ps", "-a", "--format", "{{.Names}} {{.State}}"]);
  const line = stdout
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${REDIS_CONTAINER_NAME} `));

  if (!line) {
    console.log("[dev:local] Starting Redis container");
    await runCapture("docker", ["run", "-d", "--name", REDIS_CONTAINER_NAME, "-p", "6379:6379", "redis:7"]);
    shouldStopRedisOnExit = true;
    return;
  }

  if (line.endsWith("running")) {
    console.log("[dev:local] Redis container already running");
    shouldStopRedisOnExit = true;
    return;
  }

  console.log("[dev:local] Starting existing Redis container");
  await runCapture("docker", ["start", REDIS_CONTAINER_NAME]);
  shouldStopRedisOnExit = true;
}

async function buildRuntimePackages() {
  console.log("[dev:local] Building shared runtime packages");
  await runCapture("npm", ["run", "build", "--workspace", "@wirus/game-engine"], { cwd: process.cwd() });
  await runCapture("npm", ["run", "build", "--workspace", "@wirus/shared-types"], { cwd: process.cwd() });
  await runCapture("npm", ["run", "build", "--workspace", "@wirus/shared-utils"], { cwd: process.cwd() });
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }

  if (shouldStopRedisOnExit) {
    console.log("[dev:local] Stopping Redis container");
    await runCapture("docker", ["stop", REDIS_CONTAINER_NAME]).catch(() => undefined);
  }
}

process.on("SIGINT", async () => {
  await shutdown("SIGINT");
  process.exit(130);
});

process.on("SIGTERM", async () => {
  await shutdown("SIGTERM");
  process.exit(143);
});

async function main() {
  await ensureRedis();
  await buildRuntimePackages();

  console.log("[dev:local] Starting backend");
  const backend = run("npm", ["run", "dev", "--workspace", "@wirus/backend"], { cwd: process.cwd() });

  console.log("[dev:local] Starting frontend");
  const frontend = run("npm", ["run", "dev", "--workspace", "@wirus/frontend"], { cwd: process.cwd() });

  const exitHandler = (name) => (code) => {
    if (code && code !== 0) {
      console.error(`[dev:local] ${name} exited with code ${code}`);
      void shutdown("SIGTERM").finally(() => {
        process.exit(code);
      });
    }
  };

  backend.on("exit", exitHandler("backend"));
  frontend.on("exit", exitHandler("frontend"));
}

main().catch((error) => {
  console.error(`[dev:local] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
