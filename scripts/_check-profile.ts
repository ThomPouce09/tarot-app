import { buildProfileBlock } from '../lib/profile';
(async () => {
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  await p.user.update({ where: { email: 'tsalle@ik.me' }, data: { domains: ['amour','serenite'], lifeStage: 'reconversion', tone: 'poetique', familiarity: 'praticien', birthTown: 'Lyon', birthHour: '04:30', dateOfBirth: new Date('1990-08-02') } });
  await p.$disconnect();
  const block = await buildProfileBlock('tsalle@ik.me');
  console.log('=== BLOC PROFIL PLEIN ===');
  console.log(block);
  console.log('=== BLOC PROFIL VIDE →', JSON.stringify(await buildProfileBlock('tsalle@free.fr')));
})().catch((e) => { console.error('ERR', e); process.exit(1); });
