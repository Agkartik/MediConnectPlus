const { spawn } = require("child_process");

const port = Number(process.env.PORT || 5001);

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

(async () => {
  try {
    await run("npx", ["kill-port", String(port)]);
  } catch {
    // It's fine if nothing was listening.
  }
  await run("node", ["--watch", "src/index.js"]);
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});

