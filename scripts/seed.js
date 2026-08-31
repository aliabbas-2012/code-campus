const { PrismaClient } = require('@prisma/client');
const { hashSync } = require('bcryptjs');

const db = new PrismaClient();

const PASSWORD = 'password';

const USERS = [
  { email: 'admin@example.com', name: 'Admin User', role: 'ADMIN' },
  { email: 'instructor@example.com', name: 'Instructor User', role: 'INSTRUCTOR' },
  { email: 'student@example.com', name: 'Student User', role: 'STUDENT' },
];

async function main() {
  const password_hash = hashSync(PASSWORD, 10);

  const users = [];
  for (const u of USERS) {
    const user = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, password_hash, status: 'ACTIVE' },
    });
    users.push(user);
  }

  console.log(`Seeded users (password: "${PASSWORD}" for all):`);
  for (const u of users) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
