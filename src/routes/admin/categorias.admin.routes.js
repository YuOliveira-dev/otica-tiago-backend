import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarAdmin);

function gerarSlug(texto) {
  return texto
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.get('/', async (req, res) => {
  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        subcategorias: {
          orderBy: { nome: 'asc' },
          include: {
            _count: {
              select: { produtos: true },
            },
          },
        },
        _count: {
          select: { produtos: true },
        },
      },
    });

    res.json({
      sucesso: true,
      dados: categorias,
    });
  } catch (error) {
    console.error('Erro ao listar categorias no admin:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao buscar categorias no banco de dados.',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nome, slug, ordem = 0, ativo = true } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({
        sucesso: false,
        erro: 'O nome da categoria é obrigatório.',
      });
    }

    const nomeFormatado = nome.trim();
    const slugFinal = slug?.trim() || gerarSlug(nomeFormatado);

    const [nomeExistente, slugExistente] = await Promise.all([
      prisma.categoria.findUnique({ where: { nome: nomeFormatado } }),
      prisma.categoria.findUnique({ where: { slug: slugFinal } }),
    ]);

    if (nomeExistente) {
      return res.status(409).json({
        sucesso: false,
        erro: `Já existe uma categoria cadastrada com o nome '${nomeFormatado}'.`,
      });
    }

    if (slugExistente) {
      return res.status(409).json({
        sucesso: false,
        erro: `O identificador slug '${slugFinal}' já está em uso.`,
      });
    }

    const novaCategoria = await prisma.categoria.create({
      data: {
        nome: nomeFormatado,
        slug: slugFinal,
        ordem: parseInt(ordem, 10) || 0,
        ativo: Boolean(ativo),
      },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Categoria cadastrada com sucesso!',
      dados: novaCategoria,
    });
  } catch (error) {
    console.error('Erro ao cadastrar categoria:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao cadastrar categoria.',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, slug, ordem, ativo } = req.body;

    const categoriaExistente = await prisma.categoria.findUnique({ where: { id } });
    if (!categoriaExistente) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Categoria não encontrada.',
      });
    }

    const nomeFormatado = nome ? nome.trim() : categoriaExistente.nome;
    const slugFinal = slug ? slug.trim() : (nome ? gerarSlug(nomeFormatado) : categoriaExistente.slug);

    if (nomeFormatado !== categoriaExistente.nome) {
      const nomeConflito = await prisma.categoria.findUnique({ where: { nome: nomeFormatado } });
      if (nomeConflito && nomeConflito.id !== id) {
        return res.status(409).json({ sucesso: false, erro: `Nome '${nomeFormatado}' já está em uso.` });
      }
    }

    if (slugFinal !== categoriaExistente.slug) {
      const slugConflito = await prisma.categoria.findUnique({ where: { slug: slugFinal } });
      if (slugConflito && slugConflito.id !== id) {
        return res.status(409).json({ sucesso: false, erro: `Slug '${slugFinal}' já está em uso.` });
      }
    }

    const categoriaAtualizada = await prisma.categoria.update({
      where: { id },
      data: {
        nome: nomeFormatado,
        slug: slugFinal,
        ordem: ordem !== undefined ? parseInt(ordem, 10) : undefined,
        ativo: ativo !== undefined ? Boolean(ativo) : undefined,
      },
    });

    res.json({
      sucesso: true,
      mensagem: 'Categoria atualizada com sucesso!',
      dados: categoriaAtualizada,
    });
  } catch (error) {
    console.error('Erro ao atualizar categoria:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha interna ao atualizar categoria.',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const produtosVinculados = await prisma.produto.count({
      where: { categoriaId: id },
    });

    if (produtosVinculados > 0) {
      return res.status(400).json({
        sucesso: false,
        erro: `Não é possível excluir esta categoria porque existem ${produtosVinculados} produto(s) vinculados a ela. Remova ou transfira os produtos antes.`,
      });
    }

    await prisma.categoria.delete({ where: { id } });

    res.json({
      sucesso: true,
      mensagem: 'Categoria excluída com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao excluir categoria.',
    });
  }
});

router.post('/:categoriaId/subcategorias', async (req, res) => {
  try {
    const { categoriaId } = req.params;
    const { nome, slug } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({
        sucesso: false,
        erro: 'O nome da subcategoria é obrigatório.',
      });
    }

    const categoriaPai = await prisma.categoria.findUnique({ where: { id: categoriaId } });
    if (!categoriaPai) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Categoria pai não encontrada.',
      });
    }

    const nomeFormatado = nome.trim();
    const slugFinal = slug?.trim() || gerarSlug(nomeFormatado);

    const subExistente = await prisma.subcategoria.findUnique({
      where: {
        categoriaId_slug: {
          categoriaId,
          slug: slugFinal,
        },
      },
    });

    if (subExistente) {
      return res.status(409).json({
        sucesso: false,
        erro: `Já existe uma subcategoria com slug '${slugFinal}' nesta categoria.`,
      });
    }

    const novaSubcategoria = await prisma.subcategoria.create({
      data: {
        categoriaId,
        nome: nomeFormatado,
        slug: slugFinal,
      },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Subcategoria cadastrada com sucesso!',
      dados: novaSubcategoria,
    });
  } catch (error) {
    console.error('Erro ao cadastrar subcategoria:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao cadastrar subcategoria.',
    });
  }
});

router.delete('/subcategorias/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.subcategoria.delete({ where: { id } });

    res.json({
      sucesso: true,
      mensagem: 'Subcategoria excluída com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao excluir subcategoria:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao excluir subcategoria.',
    });
  }
});

export default router;
