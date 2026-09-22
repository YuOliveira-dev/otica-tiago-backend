import multer from 'multer';

const storage = multer.memoryStorage();

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

export const uploadImagemUnica = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single('imagem');

export const uploadVideoUnico = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
}).single('video');

export const uploadMultiplasImagens = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
}).array('imagens', 10);

export default { uploadImagemUnica, uploadVideoUnico, uploadMultiplasImagens };
