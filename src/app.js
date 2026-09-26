import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { apiGeneralRateLimiter } from './middlewares/rateLimit.middleware.js';

import produtosPublicRoutes from './routes/public/produtos.routes.js';
import categoriasPublicRoutes from './routes/public/categorias.routes.js';
import bannersPublicRoutes from './routes/public/banners.routes.js';
import fretePublicRoutes from './routes/public/frete.routes.js';
import midiaPublicRoutes from './routes/public/midia.routes.js';

import authAdminRoutes from './routes/admin/auth.routes.js';
import produtosAdminRoutes from './routes/admin/produtos.admin.routes.js';
import categoriasAdminRoutes from './routes/admin/categorias.admin.routes.js';
import midiaAdminRoutes from './routes/admin/midia.admin.routes.js';
import bannersAdminRoutes from './routes/admin/banners.admin.routes.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const allowedOrigins = [
  'https://tsjoculos.com',
  'https://www.tsjoculos.com',
  'https://api.tsjoculos.com',
  'https://otica-tiago-backend.vercel.app',
  'https://frontend-five-teal-52.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  if (allowedOrigins.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
    return true;
  }

  if (/^https:\/\/(www\.|api\.)?tsjoculos\.com$/.test(origin)) {
    return true;
  }

  if (/^https:\/\/frontend-[a-z0-9-]+-yuoliveira-dev\.vercel\.app$/.test(origin) ||
      /^https:\/\/frontend-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return true;
  }

  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/', apiGeneralRateLimiter);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    sucesso: true,
    status: 'ONLINE',
    loja: 'TS EYEWEAR - Ótica 100% Online',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    ambiente: process.env.NODE_ENV || 'development',
  });
});

// DEBUG TEMPORÁRIO - remover após resolver o 401
app.get('/api/debug/auth-check', async (req, res) => {
  const result = {
    etapa1_cookie: 'PENDENTE',
    etapa2_jwtSecret: 'PENDENTE',
    etapa3_jwtVerify: 'PENDENTE',
    etapa4_sessaoBanco: 'PENDENTE',
    etapa5_expiracao: 'PENDENTE',
    etapa6_usuario: 'PENDENTE',
    erro: null,
    detalhes: {},
  };

  try {
    // Etapa 1: Extrair token do cookie
    const token = req.cookies?.admin_token;
    if (!token) {
      result.etapa1_cookie = 'FALHOU';
      result.erro = 'Cookie admin_token não encontrado';
      return res.json(result);
    }
    result.etapa1_cookie = 'OK';
    result.detalhes.tokenLength = token.length;
    result.detalhes.tokenPreview = token.substring(0, 50) + '...';

    // Etapa 2: Verificar JWT_SECRET
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '') {
      result.etapa2_jwtSecret = 'FALHOU';
      result.erro = 'JWT_SECRET não configurado';
      return res.json(result);
    }
    result.etapa2_jwtSecret = 'OK';
    result.detalhes.secretLength = secret.length;

    // Etapa 3: Verificar JWT
    const jwt = await import('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.default.verify(token, secret);
      result.etapa3_jwtVerify = 'OK';
      result.detalhes.jwtPayload = {
        id: decoded.id,
        sessionId: decoded.sessionId,
        email: decoded.email,
        exp: decoded.exp,
        expDate: new Date(decoded.exp * 1000).toISOString(),
        agora: new Date().toISOString(),
      };
    } catch (jwtErr) {
      result.etapa3_jwtVerify = 'FALHOU';
      result.erro = `JWT inválido: ${jwtErr.name} - ${jwtErr.message}`;
      return res.json(result);
    }

    // Etapa 4: Buscar sessão no banco
    const { default: prisma } = await import('./config/prisma.js');
    const sessao = await prisma.sessaoAdmin.findUnique({
      where: { token },
      include: { usuario: { select: { id: true, nome: true, email: true } } },
    });

    if (!sessao) {
      result.etapa4_sessaoBanco = 'FALHOU';
      result.erro = 'Sessão NÃO encontrada no banco de dados (token não existe na tabela SessaoAdmin)';
      result.detalhes.sessionIdFromJwt = decoded.sessionId;
      return res.json(result);
    }
    result.etapa4_sessaoBanco = 'OK';
    result.detalhes.sessaoId = sessao.id;

    // Etapa 5: Verificar expiração
    const agora = new Date();
    const expira = new Date(sessao.expiraEm);
    if (agora > expira) {
      result.etapa5_expiracao = 'FALHOU';
      result.erro = `Sessão expirada: expirou em ${expira.toISOString()}, agora é ${agora.toISOString()}`;
      return res.json(result);
    }
    result.etapa5_expiracao = 'OK';

    // Etapa 6: Verificar usuário
    if (!sessao.usuario) {
      result.etapa6_usuario = 'FALHOU';
      result.erro = 'Usuário não encontrado';
      return res.json(result);
    }
    result.etapa6_usuario = 'OK';
    result.detalhes.admin = { nome: sessao.usuario.nome, email: sessao.usuario.email };

    result.erro = null;
    res.json(result);
  } catch (err) {
    result.erro = `Erro inesperado: ${err.message}`;
    res.json(result);
  }
});

app.use('/api/produtos', produtosPublicRoutes);
app.use('/produtos', produtosPublicRoutes);

app.use('/api/categorias', categoriasPublicRoutes);
app.use('/categorias', categoriasPublicRoutes);

app.use('/api/banners', bannersPublicRoutes);
app.use('/banners', bannersPublicRoutes);

app.use('/api/frete', fretePublicRoutes);
app.use('/frete', fretePublicRoutes);

app.use('/api/midia', midiaPublicRoutes);
app.use('/midia', midiaPublicRoutes);

app.use('/api/admin/auth', authAdminRoutes);
app.use('/admin/auth', authAdminRoutes);

app.use('/api/admin/produtos', produtosAdminRoutes);
app.use('/admin/produtos', produtosAdminRoutes);

app.use('/api/admin/categorias', categoriasAdminRoutes);
app.use('/admin/categorias', categoriasAdminRoutes);

app.use('/api/admin/midia', midiaAdminRoutes);
app.use('/admin/midia', midiaAdminRoutes);

app.use('/api/admin/banners', bannersAdminRoutes);
app.use('/admin/banners', bannersAdminRoutes);

app.use('*', (req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: `Endpoint ${req.originalUrl} não encontrado na API TS EYEWEAR.`,
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erro capturado no servidor:', err);

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      sucesso: false,
      erro: 'Token de autenticação inválido ou expirado. Faça login novamente.',
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      sucesso: false,
      erro: 'Arquivo enviado excede o limite máximo permitido.',
    });
  }

  res.status(err.status || 500).json({
    sucesso: false,
    erro: err.message || 'Erro interno no servidor TS EYEWEAR.',
  });
});

const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`👓 TS EYEWEAR API - Servidor Backend Online!`);
    console.log(`🌐 Base URL: http://localhost:${PORT}/api`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Produtos: http://localhost:${PORT}/api/produtos`);
    console.log(`📁 Categorias: http://localhost:${PORT}/api/categorias`);
    console.log(`🖼️ Banners: http://localhost:${PORT}/api/banners`);
    console.log(`🚚 Frete: http://localhost:${PORT}/api/frete/calcular`);
    console.log(`🔒 Admin Auth: http://localhost:${PORT}/api/admin/auth/login`);
    console.log(`======================================================\n`);
  });
}

export default app;
