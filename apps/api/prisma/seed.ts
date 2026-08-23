import { prisma } from '../src/infrastructure/database/prisma';
import { medicationService } from '../src/modules/medications/medication.service';
import { authService } from '../src/modules/auth/auth.service';

async function seed() {
  console.log('🌱 Seeding database...');

  // 1. Ensure standard catalog medications are seeded
  await medicationService.ensureSeeded();
  console.log('✅ Medication catalog seeded.');

  // 2. Create demo account if not exists
  const demoEmail = 'patient@prescriptionly.local';
  const existing = await prisma.account.findUnique({ where: { email: demoEmail } });

  if (!existing) {
    const registered = await authService.register({
      email: demoEmail,
      password: 'Password123!',
      displayName: 'Alex Carter',
    });

    // Make admin
    await prisma.account.update({
      where: { id: registered.account.id },
      data: { isAdmin: true, isVerified: true },
    });

    console.log(`✅ Demo patient account created: ${demoEmail} (Password123!)`);
  }

  console.log('🎉 Seeding complete.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
