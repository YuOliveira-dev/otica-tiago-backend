import rateLimit from 'express-rate-limit';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    erro: 'Muitas tentativas consecutivas de login detectadas. Por segurança, tente novamente em 15 minutos.',
  },
});

export const apiGeneralRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    erro: 'Limite de requisições por minuto excedido. Aguarde alguns instantes.',
  },
});

export default { loginRateLimiter, apiGeneralRateLimiter };
