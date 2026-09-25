import { Router } from 'express';
import crypto from 'crypto';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';
import { BannerStore } from '../../services/banner.store.js';

const router = Router();

router.use(autenticarAdmin);

router.get('/', (req, res) => {
  const banners = BannerStore.obterTodos();
  res.json({
    sucesso: true,
    dados: banners,
  });
});

function validarCtaUrl(url) {
  if (!url) return true;
  const trimmed = url.trim();
  return trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed);
}

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

    if (ctaUrl && !validarCtaUrl(ctaUrl)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'URL do botão CTA inválida. Use links internos começando com "/" ou externos com "https://".',
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
      erro: 'Falha ao processar cadastro do banner.',
    });
  }
});

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

    const {
      title,
      subtitle,
      ctaText,
      ctaUrl,
      badgeTitle,
      badgeSub,
      imageUrl,
      order,
      isActive,
    } = req.body;

    if (ctaUrl !== undefined && !validarCtaUrl(ctaUrl)) {
      return res.status(400).json({
        sucesso: false,
        erro: 'URL do botão CTA inválida. Use links internos começando com "/" ou externos com "https://".',
      });
    }

    const atualizado = {
      ...bannerAtual,
      id,
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(subtitle !== undefined ? { subtitle: String(subtitle).trim() } : {}),
      ...(ctaText !== undefined ? { ctaText: String(ctaText).trim() } : {}),
      ...(ctaUrl !== undefined ? { ctaUrl: String(ctaUrl).trim() } : {}),
      ...(badgeTitle !== undefined ? { badgeTitle: String(badgeTitle).trim() } : {}),
      ...(badgeSub !== undefined ? { badgeSub: String(badgeSub).trim() } : {}),
      ...(imageUrl !== undefined ? { imageUrl: String(imageUrl).trim() } : {}),
      ...(order !== undefined ? { order: parseInt(order, 10) || 1 } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
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
      erro: 'Falha ao processar atualização do banner.',
    });
  }
});

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
