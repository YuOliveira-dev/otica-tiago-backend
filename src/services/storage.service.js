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

function validarMagicBytesImagem(buffer) {
  if (!buffer || buffer.length < 12) return false;
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: GIF8 (47 49 46 38)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WEBP: RIFF....WEBP (52 49 46 46 ... 57 45 42 50)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true;
  // AVIF/HEIC/BMP
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) return true;
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) return true; // BMP

  return false;
}

export async function processarEEnviarImagem(buffer, prefixo = 'produto') {
  if (!validarMagicBytesImagem(buffer)) {
    const erroFormato = new Error('Formato de arquivo inválido. Envie uma imagem legítima (JPEG, PNG, WEBP, GIF, AVIF ou BMP).');
    erroFormato.status = 400;
    throw erroFormato;
  }

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
      const uploadsDirResolved = path.resolve(UPLOADS_DIR);
      const caminhoLocal = path.resolve(UPLOADS_DIR, subpath);
      if (caminhoLocal.startsWith(uploadsDirResolved) && fs.existsSync(caminhoLocal)) {
        fs.unlinkSync(caminhoLocal);
      }
    }
  } catch (err) {
    console.warn('Aviso: Não foi possível remover arquivo de mídia:', err.message);
  }
}
