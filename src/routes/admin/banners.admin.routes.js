import { Router } from 'express';
import crypto from 'crypto';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';
import { BannerStore } from '../../services/banner.store.js';

const router = Router();

// Todas as rotas de banners admin exigem autenticação
router.use(autenticarAdmin);

/**
 * GET /api/admin/banners
 * Retorna todos os banners cadastrados
 */
router.get('/', (req, res) => {
  const banners = BannerStore.obterTodos();
  res.json({
    sucesso: true,
    dados: banners,
  });
});

/**
 * POST /api/admin/banners
 * Cria um novo banner para a vitrine/hero
 */
router.post('/', (req, res) => {
  try {
    const {
      title,
      subtitle,
      ctaText = 'CONFERIR COLEÇÃO',
      ctaUrl = '/catalogo',
      badgeTitle = 'Excelência Óptica',
      badgeSub = '5 Anos de Tradição',
      imageUrl,
      order = 1,
      isActive = true,
    } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Título e imagem do banner são obrigatórios.',
      });
    }

    const novoBanner = {
      id: `banner-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      title: title.trim(),
      subtitle: (subtitle || '').trim(),
      ctaText: ctaText.trim(),
      ctaUrl: ctaUrl.trim(),
      badgeTitle: badgeTitle.trim(),
      badgeSub: badgeSub.trim(),
      imageUrl: imageUrl.trim(),
      order: parseInt(order, 10) || 1,
      isActive: Boolean(isActive),
    };

    BannerStore.salvar(novoBanner);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Banner cadastrado com sucesso!',
      dados: novoBanner,
    });
  } catch (err) {
    console.error('Erro ao cadastrar banner:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao cadastrar banner.',
    });
  }
});

/**
 * PUT /api/admin/banners/:id
 * Atualiza um banner existente
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const bannerAtual = BannerStore.obterPorId(id);

    if (!bannerAtual) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Banner não encontrado.',
      });
    }

    const atualizado = {
      ...bannerAtual,
      ...req.body,
      id, // Preserva id original
    };

    BannerStore.salvar(atualizado);

    res.json({
      sucesso: true,
      mensagem: 'Banner atualizado com sucesso!',
      dados: atualizado,
    });
  } catch (err) {
    console.error('Erro ao atualizar banner:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao atualizar banner.',
    });
  }
});

/**
 * PATCH /api/admin/banners/:id/status
 * Alterna a visibilidade do banner (ativo/inativo)
 */
router.patch('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const banner = BannerStore.obterPorId(id);

    if (!banner) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Banner não encontrado.',
      });
    }

    const novoStatus = req.body.isActive !== undefined ? Boolean(req.body.isActive) : !banner.isActive;
    banner.isActive = novoStatus;
    BannerStore.salvar(banner);

    res.json({
      sucesso: true,
      mensagem: `Banner ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`,
      dados: banner,
    });
  } catch (err) {
    console.error('Erro ao alterar status do banner:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao alterar visibilidade do banner.',
    });
  }
});

/**
 * DELETE /api/admin/banners/:id
 * Exclui um banner
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    BannerStore.excluir(id);

    res.json({
      sucesso: true,
      mensagem: 'Banner excluído com sucesso!',
    });
  } catch (err) {
    console.error('Erro ao excluir banner:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao excluir banner.',
    });
  }
});

export default router;
