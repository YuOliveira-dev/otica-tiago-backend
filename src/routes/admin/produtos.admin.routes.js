import { Router } from 'express';
import prisma from '../../config/prisma.js';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';

const router = Router();

router.use(autenticarAdmin);

function gerarSlug(texto, sufixo = '') {
  const base = texto
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sufixo ? `${base}-${sufixo.toLowerCase().replace(/[^a-z0-9]/g, '')}` : base;
}

router.get('/', async (req, res) => {
  try {
    const {
      busca,
      categoria,
      status,
      pagina = 1,
      limite = 20,
      ordenarPor = 'criadoEm',
      direcao = 'desc',
    } = req.query;

    const page = Math.max(1, parseInt(pagina, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limite, 10) || 20));
    const skip = (page - 1) * take;

    const where = {};

    if (status && status !== 'TODOS') {
      where.status = status;
    }

    if (categoria) {
      where.OR = [
        { categoriaId: categoria },
        { categoria: { slug: categoria } },
      ];
    }

    if (busca && busca.trim()) {
      const termo = busca.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { titulo: { contains: termo, mode: 'insensitive' } },
            { skuPai: { contains: termo, mode: 'insensitive' } },
            { descricao: { contains: termo, mode: 'insensitive' } },
            {
              variacoes: {
                some: {
                  skuVariacao: { contains: termo, mode: 'insensitive' },
                },
              },
            },
          ],
        },
      ];
    }

    const orderBy = {};
    if (['titulo', 'skuPai', 'precoVenda', 'criadoEm', 'atualizadoEm'].includes(ordenarPor)) {
      orderBy[ordenarPor] = direcao === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.criadoEm = 'desc';
    }

    const [total, produtos] = await Promise.all([
      prisma.produto.count({ where }),
      prisma.produto.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          categoria: {
            select: { id: true, nome: true, slug: true },
          },
          subcategoria: {
            select: { id: true, nome: true, slug: true },
          },
          variacoes: {
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
          },
        },
      }),
    ]);

    const produtosComTotais = produtos.map((prod) => {
      const estoqueTotal = prod.variacoes.reduce((acc, v) => acc + (v.estoqueAtual || 0), 0);
      const imagemPrincipal = prod.midias.find((m) => m.principal)?.url || prod.midias[0]?.url || null;

      return {
        ...prod,
        estoqueTotal,
        imagemPrincipal,
      };
    });

    res.json({
      sucesso: true,
      paginacao: {
        total,
        pagina: page,
        limite: take,
        totalPaginas: Math.ceil(total / take),
      },
      dados: produtosComTotais,
    });
  } catch (error) {
    console.error('Erro ao listar produtos no admin:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha interna ao consultar catálogo de produtos.',
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const produto = await prisma.produto.findUnique({
      where: { id },
      include: {
        categoria: true,
        subcategoria: true,
        variacoes: {
          include: {
            historicoEstoque: {
              orderBy: { criadoEm: 'desc' },
              take: 10,
            },
            midias: true,
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
        erro: 'Produto não encontrado.',
      });
    }

    const estoqueTotal = produto.variacoes.reduce((acc, v) => acc + (v.estoqueAtual || 0), 0);

    res.json({
      sucesso: true,
      dados: {
        ...produto,
        estoqueTotal,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar produto por ID:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha interna ao buscar dados do produto.',
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      skuPai,
      titulo,
      slug: customSlug,
      descricao,
      precoVenda,
      precoPromocional,
      destaqueHome = false,
      novidade = false,
      outlet = false,
      status = 'ATIVO',
      categoriaId,
      subcategoriaId,
      variacoes = [],
      midias = [],
    } = req.body;

    if (!skuPai || !titulo || precoVenda === undefined || !categoriaId) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Campos obrigatórios ausentes: skuPai, titulo, precoVenda e categoriaId são requeridos.',
      });
    }

    const skuNormalizado = skuPai.trim().toUpperCase();
    const slugFinal = customSlug?.trim() || gerarSlug(titulo, skuNormalizado);

    const [skuExistente, slugExistente] = await Promise.all([
      prisma.produto.findUnique({ where: { skuPai: skuNormalizado } }),
      prisma.produto.findUnique({ where: { slug: slugFinal } }),
    ]);

    if (skuExistente) {
      return res.status(409).json({
        sucesso: false,
        erro: `O SKU Pai '${skuNormalizado}' já está em uso por outro produto.`,
      });
    }

    if (slugExistente) {
      return res.status(409).json({
        sucesso: false,
        erro: `O identificador amigável (slug) '${slugFinal}' já existe. Altere o título ou SKU.`,
      });
    }

    const novoProduto = await prisma.$transaction(async (tx) => {
      const prod = await tx.produto.create({
        data: {
          skuPai: skuNormalizado,
          titulo: titulo.trim(),
          slug: slugFinal,
          descricao: (descricao || '').trim(),
          precoVenda: Number(precoVenda),
          precoPromocional: precoPromocional ? Number(precoPromocional) : null,
          destaqueHome: Boolean(destaqueHome),
          novidade: Boolean(novidade),
          outlet: Boolean(outlet),
          status,
          categoriaId,
          subcategoriaId: subcategoriaId || null,
        },
      });

      if (Array.isArray(variacoes) && variacoes.length > 0) {
        for (let i = 0; i < variacoes.length; i++) {
          const v = variacoes[i];
          const skuVar = (v.skuVariacao || `${skuNormalizado}-${i + 1}`).trim().toUpperCase();
          const estoque = parseInt(v.estoqueAtual, 10) || 0;

          const variacaoCriada = await tx.produtoVariacao.create({
            data: {
              produtoId: prod.id,
              skuVariacao: skuVar,
              corNome: (v.corNome || 'Padrão').trim(),
              corHex: v.corHex ? v.corHex.trim() : null,
              aroMm: parseInt(v.aroMm, 10) || 0,
              ponteMm: parseInt(v.ponteMm, 10) || 0,
              hasteMm: parseInt(v.hasteMm, 10) || 0,
              material: (v.material || 'Acetato').trim(),
              estoqueAtual: estoque,
              precoDiferenciado: v.precoDiferenciado ? Number(v.precoDiferenciado) : null,
              statusAtivo: v.statusAtivo !== undefined ? Boolean(v.statusAtivo) : true,
            },
          });

          if (estoque > 0) {
            await tx.estoqueHistorico.create({
              data: {
                variacaoId: variacaoCriada.id,
                quantidade: estoque,
                tipoMovimentacao: 'ENTRADA',
                motivo: 'Estoque inicial cadastrado no lançamento do produto.',
              },
            });
          }
        }
      }

      if (Array.isArray(midias) && midias.length > 0) {
        for (let idx = 0; idx < midias.length; idx++) {
          const m = midias[idx];
          if (!m.url) continue;

          await tx.produtoMidia.create({
            data: {
              produtoId: prod.id,
              url: m.url,
              tipo: m.tipo === 'VIDEO' ? 'VIDEO' : 'IMAGEM',
              ordem: m.ordem !== undefined ? parseInt(m.ordem, 10) : idx,
              principal: m.principal !== undefined ? Boolean(m.principal) : idx === 0,
            },
          });
        }
      }

      return prod;
    });

    const produtoCompleto = await prisma.produto.findUnique({
      where: { id: novoProduto.id },
      include: {
        categoria: true,
        subcategoria: true,
        variacoes: true,
        midias: true,
      },
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Produto cadastrado com sucesso!',
      dados: produtoCompleto,
    });
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message || 'Falha ao processar o cadastro do produto.',
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      skuPai,
      titulo,
      slug: customSlug,
      descricao,
      precoVenda,
      precoPromocional,
      destaqueHome,
      novidade,
      outlet,
      status,
      categoriaId,
      subcategoriaId,
      variacoes,
      midias,
    } = req.body;

    const produtoExistente = await prisma.produto.findUnique({
      where: { id },
      include: { variacoes: true, midias: true },
    });

    if (!produtoExistente) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Produto não encontrado para atualização.',
      });
    }

    const skuNormalizado = skuPai ? skuPai.trim().toUpperCase() : produtoExistente.skuPai;
    const slugFinal = customSlug?.trim() || (titulo ? gerarSlug(titulo, skuNormalizado) : produtoExistente.slug);

    if (skuNormalizado !== produtoExistente.skuPai) {
      const skuConflito = await prisma.produto.findUnique({ where: { skuPai: skuNormalizado } });
      if (skuConflito && skuConflito.id !== id) {
        return res.status(409).json({ sucesso: false, erro: `O SKU '${skuNormalizado}' já está em uso.` });
      }
    }

    if (slugFinal !== produtoExistente.slug) {
      const slugConflito = await prisma.produto.findUnique({ where: { slug: slugFinal } });
      if (slugConflito && slugConflito.id !== id) {
        return res.status(409).json({ sucesso: false, erro: `O slug '${slugFinal}' já está em uso.` });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.produto.update({
        where: { id },
        data: {
          skuPai: skuNormalizado,
          titulo: titulo ? titulo.trim() : undefined,
          slug: slugFinal,
          descricao: descricao !== undefined ? descricao.trim() : undefined,
          precoVenda: precoVenda !== undefined ? Number(precoVenda) : undefined,
          precoPromocional: precoPromocional !== undefined ? (precoPromocional ? Number(precoPromocional) : null) : undefined,
          destaqueHome: destaqueHome !== undefined ? Boolean(destaqueHome) : undefined,
          novidade: novidade !== undefined ? Boolean(novidade) : undefined,
          outlet: outlet !== undefined ? Boolean(outlet) : undefined,
          status: status || undefined,
          categoriaId: categoriaId || undefined,
          subcategoriaId: subcategoriaId !== undefined ? (subcategoriaId || null) : undefined,
        },
      });

      if (Array.isArray(variacoes)) {
        const idsManter = variacoes.filter((v) => v.id).map((v) => v.id);

        await tx.produtoVariacao.deleteMany({
          where: {
            produtoId: id,
            id: { notIn: idsManter },
          },
        });

        for (let i = 0; i < variacoes.length; i++) {
          const v = variacoes[i];
          const skuVar = (v.skuVariacao || `${skuNormalizado}-${i + 1}`).trim().toUpperCase();
          const estoque = parseInt(v.estoqueAtual, 10) || 0;

          if (v.id) {
            const variacaoAtual = await tx.produtoVariacao.findUnique({ where: { id: v.id } });

            await tx.produtoVariacao.update({
              where: { id: v.id },
              data: {
                skuVariacao: skuVar,
                corNome: (v.corNome || 'Padrão').trim(),
                corHex: v.corHex ? v.corHex.trim() : null,
                aroMm: parseInt(v.aroMm, 10) || 0,
                ponteMm: parseInt(v.ponteMm, 10) || 0,
                hasteMm: parseInt(v.hasteMm, 10) || 0,
                material: (v.material || 'Acetato').trim(),
                estoqueAtual: estoque,
                precoDiferenciado: v.precoDiferenciado ? Number(v.precoDiferenciado) : null,
                statusAtivo: v.statusAtivo !== undefined ? Boolean(v.statusAtivo) : true,
              },
            });

            if (variacaoAtual && variacaoAtual.estoqueAtual !== estoque) {
              const diferenca = estoque - variacaoAtual.estoqueAtual;
              await tx.estoqueHistorico.create({
                data: {
                  variacaoId: v.id,
                  quantidade: Math.abs(diferenca),
                  tipoMovimentacao: diferenca > 0 ? 'ENTRADA' : 'AJUSTE',
                  motivo: `Ajuste manual via edição do produto: saldo de ${variacaoAtual.estoqueAtual} para ${estoque}.`,
                },
              });
            }
          } else {
            const novaVar = await tx.produtoVariacao.create({
              data: {
                produtoId: id,
                skuVariacao: skuVar,
                corNome: (v.corNome || 'Padrão').trim(),
                corHex: v.corHex ? v.corHex.trim() : null,
                aroMm: parseInt(v.aroMm, 10) || 0,
                ponteMm: parseInt(v.ponteMm, 10) || 0,
                hasteMm: parseInt(v.hasteMm, 10) || 0,
                material: (v.material || 'Acetato').trim(),
                estoqueAtual: estoque,
                precoDiferenciado: v.precoDiferenciado ? Number(v.precoDiferenciado) : null,
                statusAtivo: v.statusAtivo !== undefined ? Boolean(v.statusAtivo) : true,
              },
            });

            if (estoque > 0) {
              await tx.estoqueHistorico.create({
                data: {
                  variacaoId: novaVar.id,
                  quantidade: estoque,
                  tipoMovimentacao: 'ENTRADA',
                  motivo: 'Nova variação adicionada à grade de produto.',
                },
              });
            }
          }
        }
      }

      if (Array.isArray(midias)) {
        await tx.produtoMidia.deleteMany({
          where: { produtoId: id },
        });

        for (let idx = 0; idx < midias.length; idx++) {
          const m = midias[idx];
          if (!m.url) continue;

          await tx.produtoMidia.create({
            data: {
              produtoId: id,
              url: m.url,
              tipo: m.tipo === 'VIDEO' ? 'VIDEO' : 'IMAGEM',
              ordem: m.ordem !== undefined ? parseInt(m.ordem, 10) : idx,
              principal: m.principal !== undefined ? Boolean(m.principal) : idx === 0,
            },
          });
        }
      }
    });

    const produtoAtualizado = await prisma.produto.findUnique({
      where: { id },
      include: {
        categoria: true,
        subcategoria: true,
        variacoes: true,
        midias: true,
      },
    });

    res.json({
      sucesso: true,
      mensagem: 'Produto atualizado com sucesso!',
      dados: produtoAtualizado,
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: error.message || 'Falha ao atualizar dados do produto.',
    });
  }
});

router.patch('/:id/visibilidade', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['ATIVO', 'OCULTO', 'ARQUIVADO'].includes(status)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Status inválido. Escolha entre 'ATIVO', 'OCULTO' ou 'ARQUIVADO'.",
      });
    }

    const produto = await prisma.produto.update({
      where: { id },
      data: { status },
      select: { id: true, titulo: true, status: true, skuPai: true },
    });

    res.json({
      sucesso: true,
      mensagem: `Visibilidade do produto '${produto.titulo}' alterada para ${status}.`,
      dados: produto,
    });
  } catch (error) {
    console.error('Erro ao atualizar status do produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao alterar status de visibilidade.',
    });
  }
});

router.patch('/:id/destaque', async (req, res) => {
  try {
    const { id } = req.params;
    const { destaqueHome, novidade } = req.body;

    const data = {};
    if (destaqueHome !== undefined) data.destaqueHome = Boolean(destaqueHome);
    if (novidade !== undefined) data.novidade = Boolean(novidade);

    const produto = await prisma.produto.update({
      where: { id },
      data,
      include: {
        categoria: { select: { id: true, nome: true, slug: true } },
        midias: true,
        variacoes: true,
      },
    });

    res.json({
      sucesso: true,
      mensagem: `Destaque do produto '${produto.titulo}' atualizado com sucesso.`,
      dados: produto,
    });
  } catch (error) {
    console.error('Erro ao atualizar destaque do produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao atualizar destaque do produto.',
    });
  }
});

router.patch('/variacoes/:variacaoId/estoque', async (req, res) => {
  try {
    const { variacaoId } = req.params;
    const { quantidade, tipoMovimentacao, motivo } = req.body;

    const qtd = parseInt(quantidade, 10);
    if (isNaN(qtd) || qtd <= 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Informe uma quantidade inteira positiva válida para a movimentação.',
      });
    }

    if (!['ENTRADA', 'SAIDA_MANUAL', 'VENDA', 'AJUSTE'].includes(tipoMovimentacao)) {
      return res.status(400).json({
        sucesso: false,
        erro: "Tipo de movimentação inválido. Permitidos: 'ENTRADA', 'SAIDA_MANUAL', 'VENDA', 'AJUSTE'.",
      });
    }

    const variacaoAtualizada = await prisma.$transaction(async (tx) => {
      const variacao = await tx.produtoVariacao.findUnique({
        where: { id: variacaoId },
        include: { produto: { select: { titulo: true } } },
      });

      if (!variacao) {
        throw new Error('Variação de produto não encontrada.');
      }

      let novoEstoque = variacao.estoqueAtual;

      if (tipoMovimentacao === 'ENTRADA') {
        novoEstoque += qtd;
      } else if (tipoMovimentacao === 'SAIDA_MANUAL' || tipoMovimentacao === 'VENDA') {
        if (variacao.estoqueAtual < qtd) {
          throw new Error(`Estoque insuficiente! Saldo atual é de ${variacao.estoqueAtual} unidade(s).`);
        }
        novoEstoque -= qtd;
      } else if (tipoMovimentacao === 'AJUSTE') {
        novoEstoque = qtd;
      }

      const atualizado = await tx.produtoVariacao.update({
        where: { id: variacaoId },
        data: { estoqueAtual: novoEstoque },
      });

      await tx.estoqueHistorico.create({
        data: {
          variacaoId,
          quantidade: qtd,
          tipoMovimentacao,
          motivo: (motivo || `Movimentação ${tipoMovimentacao} registrada pelo administrador.`).trim(),
        },
      });

      return { ...atualizado, produtoTitulo: variacao.produto.titulo };
    });

    res.json({
      sucesso: true,
      mensagem: `Estoque da variação '${variacaoAtualizada.skuVariacao}' atualizado para ${variacaoAtualizada.estoqueAtual} un.`,
      dados: variacaoAtualizada,
    });
  } catch (error) {
    console.error('Erro na movimentação de estoque:', error);
    res.status(400).json({
      sucesso: false,
      erro: error.message || 'Falha ao processar movimentação de estoque.',
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { permanente } = req.query;

    const produto = await prisma.produto.findUnique({ where: { id } });
    if (!produto) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Produto não encontrado.',
      });
    }

    if (permanente === 'true') {
      await prisma.produto.delete({ where: { id } });
      return res.json({
        sucesso: true,
        mensagem: `Produto '${produto.titulo}' excluído permanentemente do banco de dados.`,
      });
    }

    await prisma.produto.update({
      where: { id },
      data: { status: 'ARQUIVADO' },
    });

    res.json({
      sucesso: true,
      mensagem: `Produto '${produto.titulo}' arquivado com sucesso.`,
    });
  } catch (error) {
    console.error('Erro ao excluir/arquivar produto:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha interna ao processar exclusão do produto.',
    });
  }
});

export default router;
