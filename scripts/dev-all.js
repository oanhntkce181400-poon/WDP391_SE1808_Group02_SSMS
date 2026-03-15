const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");

function run(name, cwd, args) {
  const child = spawn("npm.cmd", args, {
    cwd,
    stdio: ["inherit", "pipe", "pipe"],
    windowsHide: false,
  });

  child.stdout.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk}`);
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk}`);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      process.stderr.write(`[${name}] exited with code ${code}\n`);
      process.exitCode = code;
    }
  });

  return child;
}

const backend = run("backend", path.join(rootDir, "backend-api"), ["run", "dev"]);
const frontend = run("frontend", path.join(rootDir, "frontend-web"), ["run", "dev"]);

function shutdown() {
  backend.kill();
  frontend.kill();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
