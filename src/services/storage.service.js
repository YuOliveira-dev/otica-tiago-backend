import sharp from 'sharp';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { put, del } from '@vercel/blob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

function garantirDiretorioLocal(subdiretorio) {
  const caminho = path.join(UPLOADS_DIR, subdiretorio);
  if (!fs.existsSync(caminho)) {
    fs.mkdirSync(caminho, { recursive: true });
  }
  return caminho;
}

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

export async function processarEEnviarImagem(buffer, prefixo = 'produto') {
  const imagemOtimizada = await sharp(buffer)
    .resize(600, 600, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();

  const hash = crypto.randomBytes(6).toString('hex');
  const nomeArquivo = `${prefixo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}-${hash}.webp`;
  const caminhoBlob = `catalogo/${nomeArquivo}`;

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (blobToken) {
    try {
      const blob = await put(caminhoBlob, imagemOtimizada, {
        access: 'public',
        contentType: 'image/webp',
        token: blobToken,
      });
      return blob.url;
    } catch (err) {
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

  console.warn('⚠️ [Vercel Blob] BLOB_READ_WRITE_TOKEN não configurado no .env. Salvando localmente em uploads/catalogo.');
  const dirLocal = garantirDiretorioLocal('catalogo');
  const caminhoArquivoLocal = path.join(dirLocal, nomeArquivo);
  fs.writeFileSync(caminhoArquivoLocal, imagemOtimizada);

  const baseUrl = obterBaseUrl();
  return `${baseUrl}/uploads/catalogo/${nomeArquivo}`;
}

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

  console.warn('⚠️ [Vercel Blob] BLOB_READ_WRITE_TOKEN não configurado no .env. Salvando localmente em uploads/videos.');
  const dirLocal = garantirDiretorioLocal('videos');
  const caminhoArquivoLocal = path.join(dirLocal, nomeArquivo);
  fs.writeFileSync(caminhoArquivoLocal, buffer);

  const baseUrl = obterBaseUrl();
  return `${baseUrl}/uploads/videos/${nomeArquivo}`;
}

export async function excluirMidiaDoStorage(publicUrl) {
  try {
    if (!publicUrl) return;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) return;

    if (publicUrl.includes('/api/midia/blob?pathname=')) {
      const parsed = new URL(publicUrl, 'http://localhost');
      const pathname = parsed.searchParams.get('pathname');
      if (pathname) {
        await del(pathname, { token: blobToken });
      }
      return;
    }

    if (publicUrl.includes('blob.vercel-storage.com') || publicUrl.includes('vercel-storage.com')) {
      await del(publicUrl, { token: blobToken });
      return;
    }

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
