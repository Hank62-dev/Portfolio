import { hashPassword } from './services/auth.mjs';

// Makes the value for SPACEHANK_PASSWORD_HASH: `npm run spacehank:hash-password -- "the password"`.
// Put it in the server's settings instead of SPACEHANK_PASSWORD (and remove that one). Signing in works with the same password.

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Give a password of at least 12 characters: npm run spacehank:hash-password -- "a long password"');
  process.exit(1);
}
console.log(hashPassword(password));
