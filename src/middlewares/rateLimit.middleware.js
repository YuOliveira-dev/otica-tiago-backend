import rateLimit from 'express-rate-limit';

/**
 * Rate limiting rigoroso para prevenção de ataques de força bruta no login administrativo.
 * Limite: 5 requisições por janela de 15 minutos por IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    erro: 'Muitas tentativas consecutivas de login detectadas. Por segurança, tente novamente em 15 minutos.',
  },
});

/**
 * Rate limiting geral para proteção contra DoS em endpoints públicos e da API.
 * Limite: 120 requisições por minuto por IP.
 */
export const apiGeneralRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    sucesso: false,
    erro: 'Limite de requisições por minuto excedido. Aguarde alguns instantes.',
  },
});

export default { loginRateLimiter, apiGeneralRateLimiter };
