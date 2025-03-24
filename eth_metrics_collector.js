const Web3 = require('web3');
const { Client } = require('pg');

// Inicializar Web3 para cada minerador
const web3Miner1 = new Web3('http://localhost:8545');
const web3Miner2 = new Web3('http://localhost:8546');
const web3Miner3 = new Web3('http://localhost:8547');
const web3Miner4 = new Web3('http://localhost:8548');
const web3Miner5 = new Web3('http://localhost:8549');

// Configuração dos mineradores com Web3 e endereço conhecido
const miners = {
  minerador1: { web3: web3Miner1, address: '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061' },
  minerador2: { web3: web3Miner2, address: '0xa772f976e4E4D53D738fAE5493385a41d1DC8599' },
  minerador3: { web3: web3Miner3, address: '0xc5803Ca9b9Ff136855C287b1515D5565139926d3' },
  minerador4: { web3: web3Miner4, address: '0x9DA6D31B1b600e0e3c66f1D063F3464eeF8f2a82' },
  minerador5: { web3: web3Miner5, address: '0x06fd657C34e3213d3a8de5dfb4033b369F2Bd0Fb' }
};

// Conexão com o banco PostgreSQL
const db = new Client({
  user: 'bibi',
  host: 'localhost',
  database: 'eth_metrics',
  password: '12345',
  port: 5432
});

// Função para descobrir os endereços de mineração dos nós restantes
async function descobrirEnderecosMineradores() {
  console.log('[INFO] Descobrindo endereços de mineração para os nós sem endereço definido...');
  
  for (const [nomeValidador, config] of Object.entries(miners)) {
    // Pular mineradores que já têm endereço definido
    if (config.address) {
      console.log(`[INFO] Endereço do ${nomeValidador} já configurado: ${config.address}`);
      continue;
    }
    
    try {
      // Obter o endereço de mineração usando web3.eth.getCoinbase()
      const coinbaseAddress = await config.web3.eth.getCoinbase();
      
      if (coinbaseAddress) {
        miners[nomeValidador].address = coinbaseAddress;
        console.log(`[INFO] Endereço do ${nomeValidador} descoberto: ${coinbaseAddress}`);
      } else {
        console.warn(`[WARN] Não foi possível descobrir o endereço do ${nomeValidador}.`);
      }
    } catch (err) {
      console.error(`[ERRO] Falha ao obter endereço do ${nomeValidador}:`, err.message);
    }
  }
  
  // Verificar se todos os mineradores têm endereços
  const mineradoresSemEndereco = Object.entries(miners)
    .filter(([_, config]) => !config.address)
    .map(([nome, _]) => nome);
  
  if (mineradoresSemEndereco.length > 0) {
    console.warn(`[WARN] Os seguintes mineradores não têm endereços definidos: ${mineradoresSemEndereco.join(', ')}`);
    console.warn('[WARN] Esses mineradores serão ignorados até que seus endereços sejam descobertos.');
  }
}

// Último bloco indexado para cada minerador
const lastIndexed = {
  minerador1: 0,
  minerador2: 0,
  minerador3: 0,
  minerador4: 0,
  minerador5: 0
};

// Para calcular tempo entre blocos, etc.
let lastBlockTimestampByMiner = {
  minerador1: null,
  minerador2: null,
  minerador3: null,
  minerador4: null,
  minerador5: null
};

// Exemplo simples de armazenamento de estatísticas de mineração
let blocksMinedCount = {
  minerador1: 0,
  minerador2: 0,
  minerador3: 0,
  minerador4: 0,
  minerador5: 0
};

// Para calcular tempos de transações (heurística simples)
let txStartTimes = new Map(); // chave: tx_hash, valor: Date.now() quando detectamos pela 1ª vez

async function coletarBlocos() {
  console.log('[INFO] Iniciando ciclo de indexação...');
  for (const [nomeValidador, { web3, address }] of Object.entries(miners)) {
    try {
      // Pular mineradores sem endereço definido
      if (!address) {
        continue;
      }
      
      // 1) Consultar o bloco mais recente
      const latest = await web3.eth.getBlockNumber();
      console.log(`[DEBUG] ${nomeValidador} bloco mais recente: ${latest}`);

      for (let i = lastIndexed[nomeValidador] + 1; i <= latest; i++) {
        // 2) Obter o bloco
        const bloco = await web3.eth.getBlock(i, true);
        if (!bloco) {
          console.warn(`[WARN] Bloco ${i} não retornado por ${nomeValidador}. Pulando...`);
          continue;
        }

        // 3) Confirmar se o bloco foi minerado por este nó
        if (!bloco.miner || bloco.miner.toLowerCase() !== address.toLowerCase()) {
          // Bloco não foi minerado por este validador
          continue;
        }

        // 4) Inserir infos na tabela blocks
        await inserirBloco(nomeValidador, bloco);

        // 5) Processar transações
        console.log(`[INFO] ${nomeValidador}: Bloco ${bloco.number} com ${bloco.transactions.length} txs`);
        for (const tx of bloco.transactions) {
          await inserirTransacao(nomeValidador, bloco, tx, web3);
        }

        // 6) Calcular métricas e inserir nas outras tabelas
        await calcularMetricaMineracao(nomeValidador, bloco);
        await calcularTempoConvergencia(nomeValidador, bloco);
        await calcularTempoMedioTransacoes(nomeValidador, bloco);
        await calcularTempoValidacaoBlocos(nomeValidador, bloco);
        await calcularTempoValidacaoTransacoes(nomeValidador, bloco);

        // Atualiza contadores
        lastIndexed[nomeValidador] = i;
        blocksMinedCount[nomeValidador]++;
        lastBlockTimestampByMiner[nomeValidador] = bloco.timestamp;
      }
    } catch (e) {
      console.error(`[ERRO] Falha ao processar ${nomeValidador}:`, e.message);
    }
  }
  console.log('[INFO] Ciclo finalizado. Aguardando próximo...');
  setTimeout(coletarBlocos, 5000);
}

/** 
 * Inserir registro do bloco na tabela "blocks"
 * Adaptado para usar os nomes corretos das colunas
 */
async function inserirBloco(validador, bloco) {
  const qtdeTransacoes = bloco.transactions.length;
  // Corrigido: usando 'number' em vez de 'numero', e 'tx_count' em vez de 'qtde_transacoes'
  try {
    await db.query(`
      INSERT INTO blocks (number, timestamp, tx_count)
      VALUES ($1, $2, $3)
      ON CONFLICT (number) DO NOTHING;
    `, [
      bloco.number,
      bloco.timestamp,
      qtdeTransacoes
    ]);
    console.log(`[blocks] Bloco ${bloco.number} inserido com sucesso em blocks.`);
  } catch (err) {
    console.error(`[ERRO blocks] Ao inserir bloco ${bloco.number}: ${err.message}`);
  }
}

/**
 * Inserir cada transação na tabela "transacoes"
 * Adaptado para usar os nomes corretos das colunas
 */
async function inserirTransacao(validador, bloco, tx, web3) {
  const valueEth = web3.utils.fromWei(tx.value, 'ether');
  
  try {
    await db.query(`
      INSERT INTO transacoes (validador, tx_hash, remetente, destinatario, valor, bloco, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (tx_hash) DO NOTHING;
    `, [
      validador,
      tx.hash,
      tx.from,
      tx.to,
      valueEth,
      bloco.number
    ]);
    console.log(`[transacoes] Tx ${tx.hash} inserida no bloco ${bloco.number}.`);
  } catch (e) {
    console.error(`[ERRO transacoes] Falha ao inserir tx ${tx.hash}:`, e.message);
  }
  
  // Marca início da transação p/ calcular tempo médio depois
  if (!txStartTimes.has(tx.hash)) {
    txStartTimes.set(tx.hash, Date.now());
  }
}

/** 
 * Exemplo de métrica simples de mineração:
 * Vamos supor que "latencia_media", "latencia_maxima" etc. sejam tempos arbitrários.
 * Aqui só vou inserir dados de contagem e fingir algo.
 */
async function calcularMetricaMineracao(validador, bloco) {
  // Exemplo de dummy data:
  const latenciaMedia = Math.random() * 2;   // 0~2s
  const latenciaMaxima = latenciaMedia + Math.random();
  const latenciaMinima = Math.max(0, latenciaMedia - Math.random());
  const tempoMineracaoMedio = Math.random() * 5;
  const tempoMineracaoMaximo = tempoMineracaoMedio + Math.random();
  const tempoMineracaoMinimo = Math.max(0, tempoMineracaoMedio - Math.random());

  try {
    await db.query(`
      INSERT INTO metricas_mineracao (validador, latencia_media, latencia_maxima, latencia_minima,
        tempo_mineracao_medio, tempo_mineracao_maximo, tempo_mineracao_minimo)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (validador) DO UPDATE
      SET latencia_media = EXCLUDED.latencia_media,
          latencia_maxima = EXCLUDED.latencia_maxima,
          latencia_minima = EXCLUDED.latencia_minima,
          tempo_mineracao_medio = EXCLUDED.tempo_mineracao_medio,
          tempo_mineracao_maximo = EXCLUDED.tempo_mineracao_maximo,
          tempo_mineracao_minimo = EXCLUDED.tempo_mineracao_minimo;
    `, [
      validador,
      latenciaMedia,
      latenciaMaxima,
      latenciaMinima,
      tempoMineracaoMedio,
      tempoMineracaoMaximo,
      tempoMineracaoMinimo
    ]);
    console.log(`[metricas_mineracao] Métrica de ${validador} atualizada.`);
  } catch (err) {
    console.error(`[ERRO metricas_mineracao]`, err.message);
  }
}

/**
 * Tempo de convergência de blocos: diferença entre o timestamp atual e o anterior
 * Só como exemplo, guardaremos o "tempo_medio", "melhor_tempo", "pior_tempo".
 */
async function calcularTempoConvergencia(validador, bloco) {
  const prevTimestamp = lastBlockTimestampByMiner[validador];
  if (!prevTimestamp) {
    // primeira vez
    return;
  }
  const tempoBloco = bloco.timestamp - prevTimestamp; // em segundos
  // Exemplo: ler dados atuais, recalcular média
  // (Exemplo bem rudimentar, sem aggregator real)
  const tempoMedio = tempoBloco; 
  const melhorTempo = Math.max(0, tempoBloco - Math.random()); 
  const piorTempo = tempoBloco + Math.random();

  try {
    await db.query(`
      INSERT INTO tempo_convergencia_blocos (validador, tempo_medio, melhor_tempo, pior_tempo)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (validador) DO UPDATE
      SET tempo_medio = EXCLUDED.tempo_medio,
          melhor_tempo = EXCLUDED.melhor_tempo,
          pior_tempo   = EXCLUDED.pior_tempo;
    `, [ validador, tempoMedio, melhorTempo, piorTempo ]);
    console.log(`[tempo_convergencia_blocos] ${validador} => tempoBloco: ${tempoBloco}s`);
  } catch (err) {
    console.error(`[ERRO tempo_convergencia_blocos]`, err.message);
  }
}

/**
 * tempo_medio_transacoes: tempo médio entre envio e inclusão em bloco 
 * Aqui assumimos que no "txStartTimes" marcamos quando a tx apareceu pela 1ª vez.
 */
async function calcularTempoMedioTransacoes(validador, bloco) {
  if (!bloco.transactions.length) return;
  let somaTempos = 0;
  let count = 0;

  const now = Date.now();
  for (const tx of bloco.transactions) {
    if (txStartTimes.has(tx.hash)) {
      const start = txStartTimes.get(tx.hash);
      const diff = (now - start) / 1000.0; // seg
      somaTempos += diff;
      count++;
    }
  }

  if (count === 0) return;
  const tempoMedio = somaTempos / count;

  // Atualiza tabela com o tempo médio
  try {
    await db.query(`
      INSERT INTO tempo_medio_transacoes (validador, tempo_medio_entre_transacoes)
      VALUES ($1, $2)
      ON CONFLICT (validador) DO UPDATE
      SET tempo_medio_entre_transacoes = EXCLUDED.tempo_medio_entre_transacoes;
    `, [validador, tempoMedio]);
    console.log(`[tempo_medio_transacoes] ${validador} => ${tempoMedio.toFixed(2)}s`);
  } catch (err) {
    console.error(`[ERRO tempo_medio_transacoes]`, err.message);
  }
}

/**
 * tempo_validacao_blocos: Exemplo de latência do bloco
 * Vamos supor que é a diferença entre "chegada do bloco" e "criação do bloco".
 */
async function calcularTempoValidacaoBlocos(validador, bloco) {
  // Exemplo: tempo de "validação" = (Date.now()/1000 - bloco.timestamp)
  const tempoBloco = (Date.now()/1000) - bloco.timestamp;
  const melhorTempo = Math.max(0, tempoBloco - Math.random());
  const piorTempo   = tempoBloco + Math.random();

  try {
    await db.query(`
      INSERT INTO tempo_validacao_blocos (validador, tempo_medio, melhor_tempo, pior_tempo)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (validador) DO UPDATE
      SET tempo_medio  = EXCLUDED.tempo_medio,
          melhor_tempo= EXCLUDED.melhor_tempo,
          pior_tempo  = EXCLUDED.pior_tempo;
    `, [
      validador,
      tempoBloco,
      melhorTempo,
      piorTempo
    ]);
    console.log(`[tempo_validacao_blocos] ${validador} => ~${tempoBloco.toFixed(2)}s desde que o bloco foi minerado`);
  } catch (err) {
    console.error(`[ERRO tempo_validacao_blocos]`, err.message);
  }
}

/**
 * tempo_validacao_transacoes: Diferença entre "chegada" e "confirmação"
 * Exemplo simplificado
 */
async function calcularTempoValidacaoTransacoes(validador, bloco) {
  if (!bloco.transactions.length) return;
  let soma = 0;
  let count = 0;
  const nowSec = Date.now()/1000;

  for (const tx of bloco.transactions) {
    if (txStartTimes.has(tx.hash)) {
      const startMs = txStartTimes.get(tx.hash);
      const diffSec = nowSec - (startMs/1000);
      soma += diffSec;
      count++;
    }
  }
  if (count === 0) return;

  const tempoMedio = soma / count;
  const melhorTempo = Math.max(0, tempoMedio - Math.random());
  const piorTempo = tempoMedio + Math.random();

  try {
    await db.query(`
      INSERT INTO tempo_validacao_transacoes (validador, tempo_medio, melhor_tempo, pior_tempo)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (validador) DO UPDATE
      SET tempo_medio  = EXCLUDED.tempo_medio,
          melhor_tempo= EXCLUDED.melhor_tempo,
          pior_tempo  = EXCLUDED.pior_tempo;
    `, [
      validador,
      tempoMedio,
      melhorTempo,
      piorTempo
    ]);
    console.log(`[tempo_validacao_transacoes] ${validador} => tempoMedio ~${tempoMedio.toFixed(2)}s`);
  } catch (err) {
    console.error(`[ERRO tempo_validacao_transacoes]`, err.message);
  }
}

// Iniciar a aplicação
async function iniciarAplicacao() {
  try {
    console.log('[INFO] Conectando ao PostgreSQL...');
    await db.connect();
    console.log('[INFO] Conexão com PostgreSQL estabelecida.');
    
    console.log('[INFO] Iniciando descoberta de mineradores...');
    await descobrirEnderecosMineradores();
    
    console.log('[INFO] Iniciando coleta de blocos...');
    coletarBlocos();
  } catch (err) {
    console.error('[ERRO FATAL] Falha ao iniciar aplicação:', err);
    if (db) {
      try {
        await db.end();
        console.log('[INFO] Conexão com o banco de dados encerrada.');
      } catch (e) {
        console.error('[ERRO] Falha ao encerrar conexão com banco de dados:', e.message);
      }
    }
    process.exit(1);
  }
}

// Iniciar o aplicativo
iniciarAplicacao();