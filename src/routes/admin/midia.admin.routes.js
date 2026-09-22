import { Router } from 'express';
import { autenticarAdmin } from '../../middlewares/auth.middleware.js';
import {
  uploadImagemUnica,
  uploadMultiplasImagens,
  uploadVideoUnico,
} from '../../middlewares/upload.middleware.js';
import {
  processarEEnviarImagem,
  enviarVideo,
  excluirMidiaDoStorage,
} from '../../services/storage.service.js';

const router = Router();

router.use(autenticarAdmin);

router.post('/upload', (req, res, next) => {
  uploadImagemUnica(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        sucesso: false,
        erro: err.message || 'Erro durante o upload do arquivo de imagem.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhum arquivo de imagem foi enviado no campo "imagem".',
      });
    }

    try {
      const prefixo = req.body.prefixo || 'produto';
      const urlPublica = await processarEEnviarImagem(req.file.buffer, prefixo);

      res.json({
        sucesso: true,
        mensagem: 'Imagem otimizada e salva com sucesso!',
        dados: {
          url: urlPublica,
          tipo: 'IMAGEM',
          tamanhoOriginal: req.file.size,
          mimetypeOriginal: req.file.mimetype,
        },
      });
    } catch (uploadError) {
      console.error('Erro no processamento da imagem:', uploadError);
      res.status(500).json({
        sucesso: false,
        erro: uploadError.message || 'Falha ao processar e salvar imagem no Supabase Storage.',
      });
    }
  });
});

router.post('/upload-galeria', (req, res) => {
  uploadMultiplasImagens(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        sucesso: false,
        erro: err.message || 'Erro durante o upload da galeria de imagens.',
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhum arquivo de imagem foi enviado no campo "imagens".',
      });
    }

    try {
      const prefixo = req.body.prefixo || 'produto';

      const promessas = req.files.map((file, index) =>
        processarEEnviarImagem(file.buffer, `${prefixo}-gal-${index + 1}`)
      );

      const urls = await Promise.all(promessas);

      const midiasProcessadas = urls.map((url, idx) => ({
        url,
        tipo: 'IMAGEM',
        ordem: idx,
        principal: idx === 0,
      }));

      res.json({
        sucesso: true,
        mensagem: `${urls.length} imagem(ns) otimizada(s) e salva(s) com sucesso!`,
        dados: midiasProcessadas,
      });
    } catch (uploadError) {
      console.error('Erro no processamento da galeria:', uploadError);
      res.status(500).json({
        sucesso: false,
        erro: uploadError.message || 'Falha ao processar imagens da galeria.',
      });
    }
  });
});

router.post('/upload-video', (req, res) => {
  uploadVideoUnico(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        sucesso: false,
        erro: err.message || 'Erro durante o upload do vídeo demonstrativo.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Nenhum arquivo de vídeo foi enviado no campo "video".',
      });
    }

    try {
      const prefixo = req.body.prefixo || 'video-produto';
      const urlPublica = await enviarVideo(req.file.buffer, req.file.mimetype, prefixo);

      res.json({
        sucesso: true,
        mensagem: 'Vídeo demonstrativo salvo com sucesso!',
        dados: {
          url: urlPublica,
          tipo: 'VIDEO',
          tamanhoOriginal: req.file.size,
        },
      });
    } catch (uploadError) {
      console.error('Erro no upload de vídeo:', uploadError);
      res.status(500).json({
        sucesso: false,
        erro: uploadError.message || 'Falha ao salvar vídeo no Supabase Storage.',
      });
    }
  });
});

router.delete('/', async (req, res) => {
  try {
    const { url, tipo = 'IMAGEM' } = req.body;

    if (!url) {
      return res.status(400).json({
        sucesso: false,
        erro: 'A URL pública da mídia a ser excluída é obrigatória.',
      });
    }

    await excluirMidiaDoStorage(url, tipo);

    res.json({
      sucesso: true,
      mensagem: 'Mídia removida do armazenamento com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao excluir mídia:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao remover mídia do storage.',
    });
  }
});

export default router;
