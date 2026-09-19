import { Router } from 'express';
import { BannerStore } from '../../services/banner.store.js';

const router = Router();

/**
 * GET /api/banners
 * Retorna os banners do carrossel hero ativos ordenados por exibição
 */
router.get('/', (req, res) => {
  const bannersAtivos = BannerStore.obterAtivos();
  res.json({
    sucesso: true,
    dados: bannersAtivos,
  });
});

export default router;
