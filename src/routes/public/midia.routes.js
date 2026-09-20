import { Router } from 'express';
import { get } from '@vercel/blob';

const router = Router();

/**
 * GET /api/midia/blob?pathname=catalogo/exemplo.webp
 * Rota segura com proteção contra Path Traversal e redirecionamento de alta velocidade para o Edge CDN
 */
router.get('/blob', async (req, res) => {
  try {
    const rawPath = req.query.pathname || req.query.url;

    if (!rawPath) {
      return res.status(400).json({
        sucesso: false,
        erro: 'O parâmetro pathname é obrigatório para acessar a mídia.',
      });
    }

    // 1. Normalização e Sanitização rigorosa contra Path Traversal
    const pathname = decodeURIComponent(String(rawPath)).trim().replace(/^\/+/, '');

    if (pathname.includes('..') || pathname.includes('\\')) {
      return res.status(400).json({
        sucesso: false,
        erro: 'Caminho de arquivo inválido ou não autorizado.',
      });
    }

    // Apenas subdiretórios permitidos de catálogo de produtos e vídeos
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

    // 2. Tenta obter no store público da Vercel e redireciona permanentemente (301) para a CDN
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
      // Caso não esteja no store público, prossegue para o fallback privado
    }

    // 3. Fallback de compatibilidade para itens legados em store privado
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

      // Headers de cache de longa duração (1 ano) para CDN e navegadores
      res.setHeader('Content-Type', blobPrivado.blob.contentType || 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (blobPrivado.blob.size) {
        res.setHeader('Content-Length', blobPrivado.blob.size);
      }

      // Streaming contínuo de baixo consumo de memória
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
