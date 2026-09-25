import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

function obterJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('CONFIG_ERROR: Variável JWT_SECRET obrigatória não foi configurada no arquivo de ambiente (.env).');
  }
  return secret;
}

export async function autenticarAdmin(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Acesso não autorizado. Sessão administrativa não encontrada ou expirada.',
      });
    }

    let secret;
    try {
      secret = obterJwtSecret();
    } catch (configErr) {
      console.error('❌ Falha de configuração de segurança:', configErr.message);
      return res.status(500).json({
        sucesso: false,
        erro: 'Erro de configuração interna de autenticação no servidor.',
      });
    }

    jwt.verify(token, secret);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const sessaoAtiva = await prisma.sessaoAdmin.findFirst({
      where: {
        OR: [
          { token: tokenHash },
          { token: token },
        ],
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true,
            criadoEm: true,
          },
        },
      },
    });

    if (!sessaoAtiva) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Sessão administrativa revogada ou inexistente. Por favor, realize login novamente.',
      });
    }

    if (new Date() > new Date(sessaoAtiva.expiraEm)) {
      await prisma.sessaoAdmin.delete({ where: { id: sessaoAtiva.id } }).catch(() => {});
      return res.status(401).json({
        sucesso: false,
        erro: 'Sua sessão administrativa expirou. Por favor, realize login novamente.',
      });
    }

    if (!sessaoAtiva.usuario) {
      return res.status(401).json({
        sucesso: false,
        erro: 'Usuário administrador não encontrado no sistema.',
      });
    }

    req.admin = sessaoAtiva.usuario;
    req.tokenAdmin = token;
    req.sessaoAdmin = sessaoAtiva;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        erro: 'Sua sessão expirou. Por favor, realize login novamente.',
      });
    }

    return res.status(401).json({
      sucesso: false,
      erro: 'Token de autenticação inválido ou corrompido.',
    });
  }
}

export default autenticarAdmin;
