import bcrypt from 'bcryptjs'

const password = process.argv[2]
if (!password) {
  console.error('usage: pnpm exec tsx scripts/hash-password.ts <password>')
  process.exit(1)
}
console.log(bcrypt.hashSync(password, 10))
