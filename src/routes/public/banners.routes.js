import { Router } from 'express';
import { BannerStore } from '../../services/banner.store.js';

const router = Router();

router.get('/', (req, res) => {
  const bannersAtivos = BannerStore.obterAtivos();
  res.json({
    sucesso: true,
    dados: bannersAtivos,
  });
});

export default router;
