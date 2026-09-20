import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOGO = [
  {
    skuPai: 'TS-AZ3824',
    titulo: 'Armação Clip-on Magnético Titanium Tech',
    slug: 'armacao-clip-on-magnetico-titanium-tech-az3824',
    descricao:
      'Praticidade incomparável: grau e solar em uma única armação leve e ultra resistente. Sistema magnético de alta fixação com lentes solares polarizadas e proteção UV400 certificada. Estrutura em titânio flexível.',
    precoVenda: 389.0,
    precoPromocional: 329.9,
    destaqueHome: true,
    novidade: true,
    outlet: false,
    categoriaSlug: 'oculos-de-grau',
    subcategoriaSlug: 'grau-unissex',
    variacoes: [
      {
        skuVariacao: 'TS-AZ3824-PT-53',
        corNome: 'Preto Fosco Polarizado',
        corHex: '#1E293B',
        aroMm: 53,
        ponteMm: 17,
        hasteMm: 142,
        material: 'Titânio e TR90',
        estoqueAtual: 8,
      },
      {
        skuVariacao: 'TS-AZ3824-HAV-53',
        corNome: 'Tartaruga Demi Âmbar',
        corHex: '#78350F',
        aroMm: 53,
        ponteMm: 17,
        hasteMm: 142,
        material: 'Titânio e Acetato',
        estoqueAtual: 4,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
        ordem: 2,
        principal: false,
      },
    ],
  },
  {
    skuPai: 'TS-RX8021',
    titulo: 'Óculos de Grau Feminino Butterfly Glam Acetato',
    slug: 'oculos-de-grau-feminino-butterfly-glam-rx8021',
    descricao:
      'Design refinado em formato gatinho suave (butterfly), esculpido em blocos de acetato italiano polido à mão. Ergonomia perfeita com almofadas integradas para não marcar o nariz.',
    precoVenda: 410.0,
    precoPromocional: 349.0,
    destaqueHome: true,
    novidade: true,
    outlet: false,
    categoriaSlug: 'oculos-de-grau',
    subcategoriaSlug: 'grau-gatinho',
    variacoes: [
      {
        skuVariacao: 'TS-RX8021-HAV-52',
        corNome: 'Havana Caramelo',
        corHex: '#92400E',
        aroMm: 52,
        ponteMm: 18,
        hasteMm: 140,
        material: 'Acetato Italiano',
        estoqueAtual: 12,
      },
      {
        skuVariacao: 'TS-RX8021-CRIS-52',
        corNome: 'Cristal Nude Translúcido',
        corHex: '#FDE68A',
        aroMm: 52,
        ponteMm: 18,
        hasteMm: 140,
        material: 'Acetato Italiano',
        estoqueAtual: 6,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80',
        ordem: 2,
        principal: false,
      },
    ],
  },
  {
    skuPai: 'TS-SOL3040',
    titulo: 'Óculos de Sol Polarizado Aviador High Precision',
    slug: 'oculos-de-sol-polarizado-aviador-high-precision-3040',
    descricao:
      'A clássica silhueta aviador reinventada com hastes em liga de monel aeroespacial e ponteiras revestidas em acetato. Lentes polarizadas HD Tri-Acetate com bloqueio total de reflexos e raios UV400.',
    precoVenda: 459.0,
    precoPromocional: 389.0,
    destaqueHome: true,
    novidade: false,
    outlet: false,
    categoriaSlug: 'oculos-de-sol',
    subcategoriaSlug: 'sol-polarizado',
    variacoes: [
      {
        skuVariacao: 'TS-SOL3040-DO-58',
        corNome: 'Dourado Escovado c/ Verde G15',
        corHex: '#D97706',
        aroMm: 58,
        ponteMm: 14,
        hasteMm: 145,
        material: 'Metal Monel e Acetato',
        estoqueAtual: 15,
      },
      {
        skuVariacao: 'TS-SOL3040-PT-58',
        corNome: 'Preto Grafite c/ Cinza Polarizado',
        corHex: '#0F172A',
        aroMm: 58,
        ponteMm: 14,
        hasteMm: 145,
        material: 'Metal Monel e Acetato',
        estoqueAtual: 9,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
      {
        url: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?auto=format&fit=crop&w=800&q=80',
        ordem: 2,
        principal: false,
      },
    ],
  },
  {
    skuPai: 'TS-RX5410',
    titulo: 'Armação de Grau Unissex Round Retrô Panto',
    slug: 'armacao-de-grau-unissex-round-retro-panto-5410',
    descricao:
      'Autêntico formato Panto com ponte fechadura clássica. Leveza absoluta e presença marcante para rostos ovais e quadrados. Hastes reforçadas com alma de metal interna visível.',
    precoVenda: 349.0,
    precoPromocional: 299.0,
    destaqueHome: true,
    novidade: false,
    outlet: false,
    categoriaSlug: 'oculos-de-grau',
    subcategoriaSlug: 'grau-redondo',
    variacoes: [
      {
        skuVariacao: 'TS-RX5410-DEMI-49',
        corNome: 'Tartaruga Demi Clássico',
        corHex: '#451A03',
        aroMm: 49,
        ponteMm: 21,
        hasteMm: 145,
        material: 'Acetato de Celulose Puro',
        estoqueAtual: 7,
      },
      {
        skuVariacao: 'TS-RX5410-PT-49',
        corNome: 'Preto Brilho Polido',
        corHex: '#020617',
        aroMm: 49,
        ponteMm: 21,
        hasteMm: 145,
        material: 'Acetato de Celulose Puro',
        estoqueAtual: 10,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
    ],
  },
  {
    skuPai: 'TS-SOL4050',
    titulo: 'Óculos de Sol Bold Retangular Minimalista',
    slug: 'oculos-de-sol-bold-retangular-minimalista-4050',
    descricao:
      'Linhas geométricas contemporâneas e aro espesso chanfrado com acabamento acetinado. Visual imponente e urbano, ideal para compor produções modernas com máxima proteção.',
    precoVenda: 429.0,
    precoPromocional: 369.0,
    destaqueHome: false,
    novidade: true,
    outlet: false,
    categoriaSlug: 'oculos-de-sol',
    subcategoriaSlug: 'sol-unissex',
    variacoes: [
      {
        skuVariacao: 'TS-SOL4050-PT-54',
        corNome: 'Black Onyx c/ Lentes Fumê',
        corHex: '#18181B',
        aroMm: 54,
        ponteMm: 19,
        hasteMm: 145,
        material: 'Acetato Italiano High-Density',
        estoqueAtual: 14,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1509695507497-903c140c43b0?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
    ],
  },
  {
    skuPai: 'TS-OUT1020',
    titulo: 'Óculos de Grau Masculino Titan Square Executive',
    slug: 'oculos-de-grau-masculino-titan-square-executive-1020',
    descricao:
      'Design retangular discreto e sóbrio com meio-aro em liga de titânio acetinado e ponteiras anatômicas. Ideal para o ambiente profissional corporativo que exige sofisticação e conforto prolongado.',
    precoVenda: 379.0,
    precoPromocional: 249.0,
    destaqueHome: false,
    novidade: false,
    outlet: true,
    categoriaSlug: 'oculos-de-grau',
    subcategoriaSlug: 'grau-masculino',
    variacoes: [
      {
        skuVariacao: 'TS-OUT1020-CH-55',
        corNome: 'Chumbo Fosco Gunmetal',
        corHex: '#334155',
        aroMm: 55,
        ponteMm: 18,
        hasteMm: 140,
        material: 'Beta-Titânio com Hastes com Mola',
        estoqueAtual: 5,
      },
    ],
    midias: [
      {
        url: 'https://images.unsplash.com/photo-1582142839970-2b9daac8192a?auto=format&fit=crop&w=800&q=80',
        ordem: 1,
        principal: true,
      },
    ],
  },
];

async function main() {
  console.log('Iniciando carga do catálogo completo no Supabase...');

  for (const item of CATALOGO) {
    // 1. Achar categoria
    const categoria = await prisma.categoria.findUnique({
      where: { slug: item.categoriaSlug },
    });
    if (!categoria) {
      console.warn(`Categoria não encontrada para ${item.categoriaSlug}`);
      continue;
    }

    // 2. Achar subcategoria
    let subcategoriaId = null;
    if (item.subcategoriaSlug) {
      const sub = await prisma.subcategoria.findFirst({
        where: { slug: item.subcategoriaSlug, categoriaId: categoria.id },
      });
      if (sub) subcategoriaId = sub.id;
    }

    // 3. Upsert Produto
    const produto = await prisma.produto.upsert({
      where: { skuPai: item.skuPai },
      update: {
        titulo: item.titulo,
        slug: item.slug,
        descricao: item.descricao,
        precoVenda: item.precoVenda,
        precoPromocional: item.precoPromocional,
        destaqueHome: item.destaqueHome,
        novidade: item.novidade,
        outlet: item.outlet,
        status: 'ATIVO',
        categoriaId: categoria.id,
        subcategoriaId,
      },
      create: {
        skuPai: item.skuPai,
        titulo: item.titulo,
        slug: item.slug,
        descricao: item.descricao,
        precoVenda: item.precoVenda,
        precoPromocional: item.precoPromocional,
        destaqueHome: item.destaqueHome,
        novidade: item.novidade,
        outlet: item.outlet,
        status: 'ATIVO',
        categoriaId: categoria.id,
        subcategoriaId,
      },
    });

    console.log(`✓ Produto: ${produto.titulo} (${produto.skuPai})`);

    // 4. Variações
    for (const v of item.variacoes) {
      await prisma.produtoVariacao.upsert({
        where: { skuVariacao: v.skuVariacao },
        update: {
          corNome: v.corNome,
          corHex: v.corHex,
          aroMm: v.aroMm,
          ponteMm: v.ponteMm,
          hasteMm: v.hasteMm,
          material: v.material,
          estoqueAtual: v.estoqueAtual,
          statusAtivo: true,
        },
        create: {
          produtoId: produto.id,
          skuVariacao: v.skuVariacao,
          corNome: v.corNome,
          corHex: v.corHex,
          aroMm: v.aroMm,
          ponteMm: v.ponteMm,
          hasteMm: v.hasteMm,
          material: v.material,
          estoqueAtual: v.estoqueAtual,
          statusAtivo: true,
        },
      });
    }

    // 5. Mídias
    for (const m of item.midias) {
      const midiaExistente = await prisma.produtoMidia.findFirst({
        where: { produtoId: produto.id, url: m.url },
      });
      if (!midiaExistente) {
        await prisma.produtoMidia.create({
          data: {
            produtoId: produto.id,
            url: m.url,
            tipo: 'IMAGEM',
            ordem: m.ordem,
            principal: m.principal,
          },
        });
      }
    }
  }

  const total = await prisma.produto.count();
  console.log(`\n🎉 Carga concluída! Total de produtos no banco: ${total}`);
}

main()
  .catch((e) => {
    console.error('Erro na carga:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
