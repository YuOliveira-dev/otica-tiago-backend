import { Router } from 'express';

const router = Router();

/**
 * GET e POST /api/frete/calcular
 * Retorna as opções de entrega com Frete Grátis garantido para todo o Brasil.
 */
const calcularFreteHandler = async (req, res) => {
  try {
    const cep = req.query.cep || req.body?.cep;

    if (!cep || typeof cep !== 'string') {
      return res.status(400).json({
        sucesso: false,
        erro: 'Informe o CEP de entrega para calcular as opções de envio.',
      });
    }

    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) {
      return res.status(400).json({
        sucesso: false,
        erro: 'CEP inválido! O CEP deve conter 8 dígitos numéricos.',
      });
    }

    // Regras de negócio TS EYEWEAR: Frete 100% Grátis para todo o Brasil
    // Simulação de prazos conforme primeira faixa de CEP (regiões do Brasil)
    const primeiroDigito = parseInt(cepLimpo.charAt(0), 10);
    let prazoPacMin = 3;
    let prazoPacMax = 7;
    let prazoSedexMin = 1;
    let prazoSedexMax = 3;
    let valorSedex = 19.9;

    if (primeiroDigito <= 1) {
      // SP / Grande SP
      prazoPacMin = 2;
      prazoPacMax = 4;
      prazoSedexMin = 1;
      prazoSedexMax = 2;
      valorSedex = 14.9;
    } else if (primeiroDigito <= 3) {
      // RJ, ES, MG
      prazoPacMin = 3;
      prazoPacMax = 6;
      prazoSedexMin = 1;
      prazoSedexMax = 3;
      valorSedex = 18.9;
    } else if (primeiroDigito <= 6) {
      // Sul e Centro-Oeste
      prazoPacMin = 4;
      prazoPacMax = 8;
      prazoSedexMin = 2;
      prazoSedexMax = 4;
      valorSedex = 24.9;
    } else {
      // Norte e Nordeste
      prazoPacMin = 5;
      prazoPacMax = 10;
      prazoSedexMin = 2;
      prazoSedexMax = 5;
      valorSedex = 29.9;
    }

    res.json({
      sucesso: true,
      cep: `${cepLimpo.slice(0, 5)}-${cepLimpo.slice(5)}`,
      beneficioEspecial: 'Frete Grátis Oficial TS EYEWEAR para todo o Brasil',
      opcoes: [
        {
          modalidade: 'PAC Correios (Frete Grátis)',
          descricao: 'Envio seguro com código de rastreamento e seguro contra extravio',
          valor: 0,
          gratis: true,
          prazoDias: `${prazoPacMin} a ${prazoPacMax} dias úteis`,
        },
        {
          modalidade: 'SEDEX Expresso',
          descricao: 'Entrega rápida prioritária com seguro total',
          valor: valorSedex,
          gratis: false,
          prazoDias: `${prazoSedexMin} a ${prazoSedexMax} dias úteis`,
        },
      ],
    });
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    res.status(500).json({
      sucesso: false,
      erro: 'Não foi possível consultar as opções de entrega no momento.',
    });
  }
};

router.get('/calcular', calcularFreteHandler);
router.post('/calcular', calcularFreteHandler);

export default router;
