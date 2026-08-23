// Usage: node hash-password.js "your-chosen-password"
// Prints a bcrypt hash. Put the output in ADMIN_PASSWORD_HASH in your .env
// (or your host's environment variables). The plain password is never
// stored anywhere — only this hash.
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: node hash-password.js "your-chosen-password"');
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log("\nADMIN_PASSWORD_HASH=" + hash + "\n");
});
