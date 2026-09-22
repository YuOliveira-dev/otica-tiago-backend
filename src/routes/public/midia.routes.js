import { Router } from 'express';
import { get } from '@vercel/blob';

const router = Router();

router.get('/blob', async (req, res) => {
  try {
    const rawPath = req.query.pathname || req.query.url;

    if (!rawPath) {
      return res.status(400).json({
        sucesso: false,
        erro: 'O parâmetro pathname é obrigatório para acessar a mídia.',
      });
    }

    const pathname = decodeURIComponent(String(rawPath)).trim().replace(/^\/+/, '');

    if (pathname.includes('..') || pathname.includes('\\')) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Caminho de arquivo inválido ou não autorizado.',
      });
    }

    const isCatalogo = pathname.startsWith('catalogo/');
    const isVideos = pathname.startsWith('videos/');

    if (!isCatalogo && !isVideos) {
      return res.status(403).json({
        sucesso: false,
        erro: 'Acesso negado: apenas mídias de catálogo e vídeos são acessíveis.',
      });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(503).json({
        sucesso: false,
        erro: 'Serviço de armazenamento de mídia temporariamente indisponível.',
      });
    }

    try {
      const blobPublico = await get(pathname, {
        access: 'public',
        token,
        useCache: true,
      });

      if (blobPublico?.blob?.url) {
        return res.redirect(301, blobPublico.blob.url);
      }
    } catch {
    }

    try {
      const blobPrivado = await get(pathname, {
        access: 'private',
        token,
        useCache: true,
      });

      if (!blobPrivado || blobPrivado.statusCode === 404) {
        return res.status(404).json({
          sucesso: false,
          erro: 'Arquivo de mídia não encontrado no Vercel Blob.',
        });
      }

      res.setHeader('Content-Type', blobPrivado.blob.contentType || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (blobPrivado.blob.size) {
        res.setHeader('Content-Length', blobPrivado.blob.size);
      }

      const reader = blobPrivado.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } catch (errPrivado) {
      console.error('Erro ao acessar mídia no Vercel Blob:', errPrivado);
      return res.status(404).json({
        sucesso: false,
        erro: 'Arquivo de mídia não encontrado.',
      });
    }
  } catch (err) {
    console.error('Erro inesperado na rota de mídia:', err);
    res.status(500).json({
      sucesso: false,
      erro: 'Falha interna ao processar mídia.',
    });
  }
});

export default router;
