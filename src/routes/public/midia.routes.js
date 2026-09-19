import { Router } from 'express';
import { get } from '@vercel/blob';

const router = Router();

/**
 * GET /api/midia/blob?pathname=catalogo/exemplo.webp
 * Servidor proxy de streaming de alta performance com cache HTTP para Vercel Blob Privado
 */
router.get('/blob', async (req, res) => {
  try {
    const pathname = req.query.pathname || req.query.url;

    if (!pathname) {
      return res.status(400).json({
        sucesso: false,
        erro: 'O parâmetro pathname ou url é obrigatório para acessar a mídia.',
      });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const storeId = process.env.BLOB_STORE_ID;

    const blobResult = await get(pathname, {
      access: 'private',
      token,
      storeId,
      useCache: true,
    });

    if (!blobResult || blobResult.statusCode === 404) {
      return res.status(404).json({
        sucesso: false,
        erro: 'Arquivo de mídia não encontrado no Vercel Blob.',
      });
    }

    // Headers de cache de longa duração (1 ano) para CDN e navegadores
    res.setHeader('Content-Type', blobResult.blob.contentType || 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (blobResult.blob.size) {
      res.setHeader('Content-Length', blobResult.blob.size);
    }

    // Streaming contínuo sem alocação desnecessária de memória
    const reader = blobResult.stream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error('Erro no streaming de mídia do Vercel Blob:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha ao transmitir arquivo de mídia.',
    });
  }
});

export default router;
