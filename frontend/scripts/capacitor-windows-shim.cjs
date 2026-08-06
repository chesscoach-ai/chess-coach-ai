// Node 24 peut échouer à lire os.userInfo() dans certains environnements
// Windows restreints. Capacitor n'utilise ces données que pour détecter le
// terminal, donc un repli local suffit pour permettre la génération native.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const os = require("node:os");

try {
  os.userInfo();
} catch {
  os.userInfo = () => ({
    uid: -1,
    gid: -1,
    username: process.env.USERNAME || "developer",
    homedir: process.env.USERPROFILE || process.cwd(),
    shell: process.env.ComSpec || "cmd.exe",
  });
}
