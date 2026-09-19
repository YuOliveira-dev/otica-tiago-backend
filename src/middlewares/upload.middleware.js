import multer from 'multer';

// Armazenamento em memória (Buffer) para processamento em streaming direto com Sharp
const storage = multer.memoryStorage();

// Filtro estrito de MIME types permitidos
const fileFilter = (req, file, cb) => {
  const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
  ];

  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Tipo de arquivo não suportado! Envie exclusivamente imagens nos formatos WebP, JPEG ou PNG, ou vídeos nos formatos MP4 ou WebM.'
      ),
      false
    );
  }
};

/**
 * Middleware Multer para upload de imagens individuais (máximo 5MB)
 */
export const uploadImagemUnica = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
}).single('imagem');

/**
 * Middleware Multer para upload de vídeos de demonstração (máximo 15MB)
 */
export const uploadVideoUnico = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB
  },
}).single('video');

/**
 * Middleware Multer para upload múltiplo de fotos da galeria (até 10 fotos, 5MB cada)
 */
export const uploadMultiplasImagens = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
}).array('imagens', 10);

export default { uploadImagemUnica, uploadVideoUnico, uploadMultiplasImagens };
