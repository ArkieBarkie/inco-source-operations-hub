import {hash} from 'bcryptjs';

const password = process.argv[2];
if (!password || password.length < 14) {
  console.error('Gebruik: npm run auth:hash -- "een-wachtwoord-van-minimaal-14-tekens"');
  process.exit(1);
}

console.log(await hash(password, 12));
