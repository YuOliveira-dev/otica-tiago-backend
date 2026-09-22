import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco de dados TS EYEWEAR...');

  // 1. Criação do Usuário Administrador Padrão a partir do .env
  const emailAdmin = process.env.ADMIN_DEFAULT_EMAIL?.toLowerCase().trim();
  const senhaPadrao = process.env.ADMIN_DEFAULT_PASSWORD;

  if (emailAdmin && senhaPadrao) {
    const adminExistente = await prisma.usuarioAdmin.findUnique({
      where: { email: emailAdmin },
    });

    if (!adminExistente) {
      const senhaHash = await bcrypt.hash(senhaPadrao, 12);

      await prisma.usuarioAdmin.create({
        data: {
          nome: process.env.ADMIN_DEFAULT_NAME || 'Administrador TS EYEWEAR',
          email: emailAdmin,
          senhaHash,
        },
      });
      console.log(`✓ Administrador criado a partir de variáveis de ambiente (.env): ${emailAdmin}`);
    } else {
      console.log(`✓ Administrador já existe no banco: ${emailAdmin}`);
    }
  } else {
    console.log('ℹ️ Variáveis ADMIN_DEFAULT_EMAIL ou ADMIN_DEFAULT_PASSWORD não configuradas no .env. Pulando criação automática de usuário admin.');
  }

  // 2. Categorias e Subcategorias Oficiais
  const categorias = [
    {
      nome: 'Óculos de Grau',
      slug: 'oculos-de-grau',
      ordem: 1,
      subcategorias: [
        { nome: 'Feminino', slug: 'grau-feminino' },
        { nome: 'Masculino', slug: 'grau-masculino' },
        { nome: 'Unissex', slug: 'grau-unissex' },
        { nome: 'Redondo', slug: 'grau-redondo' },
        { nome: 'Quadrado', slug: 'grau-quadrado' },
        { nome: 'Gatinho', slug: 'grau-gatinho' },
        { nome: 'Aviador', slug: 'grau-aviador' },
      ],
    },
    {
      nome: 'Óculos de Sol',
      slug: 'oculos-de-sol',
      ordem: 2,
      subcategorias: [
        { nome: 'Feminino', slug: 'sol-feminino' },
        { nome: 'Masculino', slug: 'sol-masculino' },
        { nome: 'Unissex', slug: 'sol-unissex' },
        { nome: 'Polarizado', slug: 'sol-polarizado' },
        { nome: 'Esportivo', slug: 'sol-esportivo' },
      ],
    },
    {
      nome: 'Lançamentos',
      slug: 'lancamentos',
      ordem: 3,
      subcategorias: [],
    },
    {
      nome: 'Outlet',
      slug: 'outlet',
      ordem: 4,
      subcategorias: [],
    },
  ];

  for (const cat of categorias) {
    const categoriaSalva = await prisma.categoria.upsert({
      where: { slug: cat.slug },
      update: { nome: cat.nome, ordem: cat.ordem },
      create: {
        nome: cat.nome,
        slug: cat.slug,
        ordem: cat.ordem,
      },
    });

    for (const sub of cat.subcategorias) {
      await prisma.subcategoria.upsert({
        where: {
          categoriaId_slug: {
            categoriaId: categoriaSalva.id,
            slug: sub.slug,
          },
        },
        update: { nome: sub.nome },
        create: {
          nome: sub.nome,
          slug: sub.slug,
          categoriaId: categoriaSalva.id,
        },
      });
    }
  }

  console.log('✓ Categorias e subcategorias semeadas com sucesso!');
  console.log('Seed concluído com sucesso.');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
