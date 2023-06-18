const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();

  if (existingUsers !== 0) {
    console.log(`Skipping Seed as users are already existing`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        email: 'admin@example.com',
        password: await bcrypt.hash('123456', 10),
      },
    });

    await tx.email.createMany({
      data: [
        {
          senderMail: 'human@example.com',
          senderName: 'Human',
          subject: 'Not-Phishing',
          headers: 'X-Header: Test',
          body: 'Dies ist keine Phishing-Mail' + '<br />'.repeat(200),
          backofficeIdentifier: 'Not-Phishing',
        },
        {
          senderMail: 'phish@example.com',
          senderName: 'Phish',
          subject: 'Phishing',
          headers: 'X-Header: Test',
          body: 'Dies ist eine Phishing-Mail <a href="https://example.com">Link</a>' + '<br />'.repeat(200),
          backofficeIdentifier: 'Phishing',
        },
      ],
    });

    const emails = await tx.email.findMany();

    await tx.study.create({
      data: {
        name: 'Teststudie',
        code: '123',
        introductionText: 'Test-Beschreibung',
        durationInMinutes: 10,
        folder: {
          createMany: {
            data: [
              {
                name: 'Jetzt bearbeiten',
                isPhishing: false,
                order: 0,
              },
              {
                name: 'Später bearbeiten',
                isPhishing: false,
                order: 1,
              },
              {
                name: 'Junk',
                isPhishing: true,
                order: 2,
              },
            ],
          },
        },
        email: {
          createMany: {
            data: [
              {
                emailId: emails.find((e) => e.backofficeIdentifier === 'Not-Phishing').id,
                isPhishing: false,
              },
              {
                emailId: emails.find((e) => e.backofficeIdentifier === 'Phishing').id,
                isPhishing: true,
              },
            ],
          },
        },
      },
    });
  });

  console.log(`Seed completed`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
