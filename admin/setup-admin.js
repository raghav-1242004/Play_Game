const bcrypt = require("bcryptjs");
const readline = require("readline");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Enter the initial admin password: ", async (password) => {
  rl.close();
  if (!password || password.length < 12) { console.error("Use at least 12 characters."); process.exit(1); }
  const hash = await bcrypt.hash(password, 12);
  console.log("\nAdd this value to your hosting environment as ADMIN_PASSWORD_HASH:\n");
  console.log(hash);
  console.log("\nDo not commit this hash or your .env file to a public repository.");
});
