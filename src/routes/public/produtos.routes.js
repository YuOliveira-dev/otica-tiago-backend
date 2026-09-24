import { Router } from 'express';
import prisma from '../../config/prisma.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const {
      busca,
      categoria,
      subcategoria,
      genero,
      formato,
      material,
      apenasEmEstoque,
      ordenar = 'populares',
      pagina = 1,
      limite = 12,
    } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limite, 10) || 12));
    const skip = (page - 1) * take;

    const where = {
      status: 'ATIVO',
    };

    if (busca && typeof busca === 'string' && busca.trim()) {
      const termo = busca.trim();
      where.OR = [
        { titulo: { contains: termo, mode: 'insensitive' } },
        { skuPai: { contains: termo, mode: 'insensitive' } },
        { descricao: { contains: termo, mode: 'insensitive' } },
      ];
    }

    if (categoria && typeof categoria === 'string') {
      if (categoria.toLowerCase() === 'outlet') {
        where.outlet = true;
      } else if (categoria.toLowerCase() === 'novidades') {
        where.novidade = true;
      } else {
        const cleanNome = categoria.replace(/-/g, ' ');
        where.categoria = {
          OR: [
            { slug: categoria },
            { id: categoria },
            { nome: { contains: cleanNome, mode: 'insensitive' } },
          ],
        };
      }
    }

    if (subcategoria && typeof subcategoria === 'string') {
      where.subcategoria = {
        OR: [{ slug: subcategoria }, { id: subcategoria }],
      };
    }

    const variacaoWhere = {
      statusAtivo: true,
    };

    if (material && typeof material === 'string') {
      variacaoWhere.material = { contains: material.trim(), mode: 'insensitive' };
    }

    if (apenasEmEstoque === 'true') {
      variacaoWhere.estoqueAtual = { gt: 0 };
    }

    if (Object.keys(variacaoWhere).length > 1 || apenasEmEstoque === 'true') {
      where.variacoes = {
        some: variacaoWhere,
      };
    }

    let orderBy = {};
    switch (ordenar) {
      case 'menor_preco':
      case 'price_asc':
        orderBy = { precoVenda: 'asc' };
        break;
      case 'maior_preco':
      case 'price_desc':
        orderBy = { precoVenda: 'desc' };
        break;
      case 'novidades':
      case 'newest':
        orderBy = [{ novidade: 'desc' }, { criadoEm: 'desc' }];
        break;
      case 'populares':
      case 'popular':
      default:
        orderBy = [{ destaqueHome: 'desc' }, { atualizadoEm: 'desc' }];
        break;
    }

    const [total, produtos] = await Promise.all([
      prisma.produto.count({ where }),
      prisma.produto.findMany({
        where,
        take,
        skip,
        orderBy,
        include: {
          categoria: { select: { id: true, nome: true, slug: true } },
          subcategoria: { select: { id: true, nome: true, slug: true } },
          variacoes: {
            where: { statusAtivo: true },
            select: {
              id: true,
              skuVariacao: true,
              corNome: true,
              corHex: true,
              aroMm: true,
              ponteMm: true,
              hasteMm: true,
              material: true,
              estoqueAtual: true,
              precoDiferenciado: true,
              statusAtivo: true,
            },
          },
          midias: {
            orderBy: [{ principal: 'desc' }, { ordem: 'asc' }],
            select: {
              id: true,
              url: true,
              tipo: true,
              ordem: true,
              principal: true,
              variacaoId: true,
            },
          },
        },
      }),
    ]);

    res.json({
      sucesso: true,
      dados: produtos,
      paginacao: {
        total,
        pagina: page,
        limite: take,
        totalPaginas: Math.ceil(total / take) || 1,
      },
    });
  } catch (error) {
    console.error('Erro ao listar produtos públicos:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Não foi possível carregar o catálogo de produtos no momento.',
    });
  }
});

router.get('/destaques', async (req, res) => {
  try {
    const produtos = await prisma.produto.findMany({
      where: {
        status: 'ATIVO',
        OR: [{ destaqueHome: true }, { novidade: true }],
      },
      take: 8,
      orderBy: [{ destaqueHome: 'desc' }, { atualizadoEm: 'desc' }],
      include: {
        categoria: { select: { id: true, nome: true, slug: true } },
        variacoes: {
          where: { statusAtivo: true },
        },
        midias: {
          orderBy: [{ principal: 'desc' }, { ordem: 'asc' }],
        },
      },
    });

    res.json({
      sucesso: true,
      dados: produtos,
    });
  } catch (error) {
    console.error('Erro ao buscar produtos em destaque:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Não foi possível buscar produtos em destaque.',
    });
  }
});

router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;

    const produto = await prisma.produto.findFirst({
      where: {
        status: 'ATIVO',
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        categoria: true,
        subcategoria: true,
        variacoes: {
          where: { statusAtivo: true },
          include: {
            midias: {
              orderBy: [{ principal: 'desc' }, { ordem: 'asc' }],
            },
          },
        },
        midias: {
          orderBy: [{ principal: 'desc' }, { ordem: 'asc' }],
        },
      },
    });

    if (!produto) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Modelo de óculos não encontrado no catálogo.',
      });
    }

    res.json({
      sucesso: true,
      dados: produto,
    });
  } catch (error) {
    console.error('Erro ao buscar detalhes do produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Não foi possível carregar os detalhes do produto.',
    });
  }
});

export default router;
