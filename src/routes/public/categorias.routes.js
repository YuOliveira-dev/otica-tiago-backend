import { Router } from 'express';
import prisma from '../../config/prisma.js';

const router = Router();

/**
 * GET /api/categorias
 * Retorna a taxonomia oficial de categorias e subcategorias ativas da TS EYEWEAR
 */
router.get('/', async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: { ordem: 'asc' },
      include: {
        subcategorias: {
          select: {
            id: true,
            nome: true,
            slug: true,
          },
        },
        _count: {
          select: {
            produtos: {
              where: { status: 'ATIVO' },
            },
          },
        },
      },
    });

    res.json({
      sucesso: true,
      dados: categorias.map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        slug: cat.slug,
        ordem: cat.ordem,
        totalProdutosAtivos: cat._count.produtos,
        subcategorias: cat.subcategorias,
      })),
    });
  } catch (error) {
    console.error('Erro ao listar categorias públicas:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Não foi possível carregar a lista de categorias.',
    });
  }
});

export default router;
