import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Temas por defecto del ecosistema ─────────────────────────────────────────

const DEFAULT_THEMES = [
  {
    projectKey: 'saas-inmobiliario',
    name: 'SaaS Inmobiliario',
    config: {
      primaryColor: '#2563EB',
      secondaryColor: '#10B981',
      accentColor: '#F59E0B',
      backgroundColor: '#F8FAFC',
      textColor: '#0F172A',
      borderRadius: 8,
      fontMain: 'Inter',
      fontHeading: 'Inter',
      themeMode: 'light',
      customTokens: {},
    },
  },
  {
    projectKey: 'gestion-qr',
    name: 'Gestión de QR',
    config: {
      primaryColor: '#7C3AED',
      secondaryColor: '#EC4899',
      accentColor: '#06B6D4',
      backgroundColor: '#FAFAFA',
      textColor: '#18181B',
      borderRadius: 12,
      fontMain: 'Nunito',
      fontHeading: 'Nunito',
      themeMode: 'light',
      customTokens: {},
    },
  },
  {
    projectKey: 'nodo-catamarca',
    name: 'Sistema NODO Catamarca',
    config: {
      primaryColor: '#E63946',
      secondaryColor: '#1D3557',
      accentColor: '#457B9D',
      backgroundColor: '#F1FAEE',
      textColor: '#1D3557',
      borderRadius: 6,
      fontMain: 'Roboto',
      fontHeading: 'Roboto',
      themeMode: 'light',
      customTokens: {},
    },
  },
  {
    projectKey: 'admin-panel',
    name: 'Panel Administrativo',
    config: {
      primaryColor: '#0F172A',
      secondaryColor: '#334155',
      accentColor: '#3B82F6',
      backgroundColor: '#F8FAFC',
      textColor: '#0F172A',
      borderRadius: 4,
      fontMain: 'Inter',
      fontHeading: 'Inter',
      themeMode: 'light',
      customTokens: {},
    },
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding temas por defecto...\n');

  for (const theme of DEFAULT_THEMES) {
    const result = await prisma.projectTheme.upsert({
      where:  { projectKey: theme.projectKey },
      update: {},            // si ya existe, no lo toca
      create: theme,
    });

    console.log(`  ✔ ${result.projectKey} — ${result.name}`);
  }

  console.log('\n✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());