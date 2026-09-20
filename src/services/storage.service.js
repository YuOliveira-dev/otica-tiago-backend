import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put, del } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Garante que diretórios locais de fallback existam
 */
function garantirDiretorioLocal(subdiretorio) {
  const caminho = path.join(UPLOADS_DIR, subdiretorio);
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
  return caminho;
}

/**
 * Retorna a base URL da API
 */
function obterBaseUrl() {
  if (process.env.BACKEND_PUBLIC_URL) {
    return process.env.BACKEND_PUBLIC_URL.replace(/\/+$/, '');
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL) {
    return 'https://otica-tiago-backend.vercel.app';
  }
  const port = process.env.PORT || 5000;
  return `http://localhost:${port}`;
}

/**
 * Processa e otimiza a imagem para padrão ótico (600x600px WebP)
 * e faz o upload para o Vercel Blob com CDN pública direta de alta performance
 *
 * @param {Buffer} buffer - Buffer bruto do arquivo enviado pelo Multer
 * @param {string} prefixo - Prefixo de identificação (ex: SKU do produto)
 * @returns {Promise<string>} URL pública permanente no Edge CDN da Vercel
 */
export async function processarEEnviarImagem(buffer, prefixo = 'produto') {
  // 1. Processamento e Otimização via Sharp (WebP 85% para óculos)
  const imagemOtimizada = await sharp(buffer)
    .resize(600, 600, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // Fundo branco suave para ótica
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  // 2. Geração de nome único e seguro
  const hash = crypto.randomBytes(6).toString('hex');
  const nomeArquivo = `${prefixo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${hash}.webp`;
  const caminhoBlob = `catalogo/${nomeArquivo}`;

  // 3. Upload para Vercel Blob
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      // Upload com acesso público direto no Edge CDN da Vercel
      const blob = await put(caminhoBlob, imagemOtimizada, {
        access: 'public',
        contentType: 'image/webp',
        token: blobToken,
      });
      return blob.url;
    } catch (err) {
      // Se o store configurado for privado, fallback seguro com proxy autenticado
      if (
        err.message?.includes('private store') ||
        err.message?.includes('Cannot use public access')
      ) {
        const blob = await put(caminhoBlob, imagemOtimizada, {
          access: 'private',
          contentType: 'image/webp',
          token: blobToken,
        });

        const baseUrl = obterBaseUrl();
        return `${baseUrl}/api/midia/blob?pathname=${encodeURIComponent(blob.pathname)}`;
      }
      throw err;
    }
  }

  // Fallback para desenvolvimento local sem token do Vercel Blob configurado
  console.warn('⚠️ [Vercel Blob] BLOB_READ_WRITE_TOKEN não configurado no .env. Salvando localmente em uploads/catalogo.');
  const dirLocal = garantirDiretorioLocal('catalogo');
  const caminhoArquivoLocal = path.join(dirLocal, nomeArquivo);
  fs.writeFileSync(caminhoArquivoLocal, imagemOtimizada);

  const baseUrl = obterBaseUrl();
  return `${baseUrl}/uploads/catalogo/${nomeArquivo}`;
}

/**
 * Valida e envia arquivo de vídeo de demonstração para o Vercel Blob
 *
 * @param {Buffer} buffer - Buffer do arquivo de vídeo
 * @param {string} mimetype - Tipo MIME (ex: 'video/mp4')
 * @param {string} prefixo - Prefixo de identificação
 * @returns {Promise<string>} URL pública permanente do vídeo
 */
export async function enviarVideo(buffer, mimetype, prefixo = 'video') {
  const extensao = mimetype === 'video/webm' ? 'webm' : 'mp4';
  const hash = crypto.randomBytes(6).toString('hex');
  const nomeArquivo = `${prefixo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${hash}.${extensao}`;
  const caminhoBlob = `videos/${nomeArquivo}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      const blob = await put(caminhoBlob, buffer, {
        access: 'public',
        contentType: mimetype,
        token: blobToken,
      });
      return blob.url;
    } catch (err) {
      if (
        err.message?.includes('private store') ||
        err.message?.includes('Cannot use public access')
      ) {
        const blob = await put(caminhoBlob, buffer, {
          access: 'private',
          contentType: mimetype,
          token: blobToken,
        });
        const baseUrl = obterBaseUrl();
        return `${baseUrl}/api/midia/blob?pathname=${encodeURIComponent(blob.pathname)}`;
      }
      throw err;
    }
  }

  // Fallback local
  console.warn('⚠️ [Vercel Blob] BLOB_READ_WRITE_TOKEN não configurado no .env. Salvando localmente em uploads/videos.');
  const dirLocal = garantirDiretorioLocal('videos');
  const caminhoArquivoLocal = path.join(dirLocal, nomeArquivo);
  fs.writeFileSync(caminhoArquivoLocal, buffer);

  const baseUrl = obterBaseUrl();
  return `${baseUrl}/uploads/videos/${nomeArquivo}`;
}

/**
 * Remove um arquivo de mídia do Vercel Blob pela sua URL pública
 *
 * @param {string} publicUrl - URL pública do arquivo
 */
export async function excluirMidiaDoStorage(publicUrl) {
  try {
    if (!publicUrl) return;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return;

    // Se for URL roteada via proxy do backend
    if (publicUrl.includes('/api/midia/blob?pathname=')) {
      const parsed = new URL(publicUrl, 'http://localhost');
      const pathname = parsed.searchParams.get('pathname');
      if (pathname) {
        await del(pathname, { token: blobToken });
      }
      return;
    }

    // Se for URL direta do Vercel Blob
    if (publicUrl.includes('blob.vercel-storage.com') || publicUrl.includes('vercel-storage.com')) {
      await del(publicUrl, { token: blobToken });
      return;
    }

    // Se for arquivo local do fallback
    if (publicUrl.includes('/uploads/')) {
      const subpath = publicUrl.substring(publicUrl.indexOf('/uploads/') + 9);
      const caminhoLocal = path.join(UPLOADS_DIR, subpath);
      if (fs.existsSync(caminhoLocal)) {
        fs.unlinkSync(caminhoLocal);
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível remover arquivo de mídia:', err.message);
  }
}
