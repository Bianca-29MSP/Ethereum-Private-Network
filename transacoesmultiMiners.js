const Web3 = require('web3');
const fs = require('fs');

// Configurações
const accountsPerMiner = 10; // Máximo de contas por minerador
const transactionFrequency = 5000; // 5 segundos entre transações (aumentado para evitar sobrecarga)
const logFilePath = './transaction_history.json'; // Arquivo de log
const PASSWORD = '12345'; // Senha fixa para todas as contas

// URLs dos mineradores
const minerUrls = [
  'http://localhost:8545', // miner-1
  'http://localhost:8546', // miner-2
  'http://localhost:8547', // miner-3
  'http://localhost:8548', // miner-4
  'http://localhost:8549'  // miner-5
];
const minerNames = ['miner-1', 'miner-2', 'miner-3', 'miner-4', 'miner-5'];

// As master accounts serão descobertas dinamicamente
const masterAccounts = {
  'miner-1': null,
  'miner-2': null,
  'miner-3': null,
  'miner-4': null,
  'miner-5': null
};

// Armazena conexões Web3 para cada minerador
const web3Instances = {};

// Armazena contas
let accounts = {
  'miner-1': [],
  'miner-2': [],
  'miner-3': [],
  'miner-4': [],
  'miner-5': []
};

// Armazena histórico de transações
let transactionHistory = [];

// Carrega histórico anterior, se existir
function loadTransactionHistory() {
  if (fs.existsSync(logFilePath)) {
    try {
      const data = fs.readFileSync(logFilePath, 'utf8');
      transactionHistory = JSON.parse(data);
      console.log(`📜 Carregado histórico com ${transactionHistory.length} transações`);
    } catch (err) {
      console.error(`❌ Erro ao carregar histórico: ${err.message}`);
      transactionHistory = [];
    }
  }
}

// Salva histórico de transações
function saveTransactionHistory() {
  try {
    fs.writeFileSync(logFilePath, JSON.stringify(transactionHistory, null, 2));
    console.log(`📝 Histórico salvo com ${transactionHistory.length} transações`);
  } catch (err) {
    console.error(`❌ Erro ao salvar histórico: ${err.message}`);
  }
}

// Estatísticas
let stats = {
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  totalGasUsed: 0,
  startTime: null
};

// Função para pausar a execução
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Inicializa o Web3 com timeout maior
function createWeb3Instance(url) {
  const provider = new Web3.providers.HttpProvider(url, {
    timeout: 60000, // Aumentado para 60 segundos
    keepAlive: true
  });
  return new Web3(provider);
}

// Inicializar Web3 para todos os mineradores
function initializeWeb3Instances() {
  minerUrls.forEach((url, index) => {
    const minerName = minerNames[index];
    web3Instances[minerName] = createWeb3Instance(url);
  });
  
  console.log(`🔌 Inicializadas ${Object.keys(web3Instances).length} conexões Web3`);
}

// Função com retentativas para operações Web3
async function retryOperation(operation, maxRetries = 5, delay = 2000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err;
      console.log(`⚠️ Tentativa ${attempt + 1}/${maxRetries} falhou: ${err.message}`);
      if (attempt < maxRetries - 1) {
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// Verificar se os mineradores estão prontos
async function checkMinersReady() {
  console.log('🔍 Verificando se os mineradores estão prontos...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    try {
      // Verificar se o nó está sincronizado
      const syncing = await retryOperation(() => web3.eth.isSyncing());
      if (syncing) {
        console.log(`⚠️ ${minerName}: Nó ainda está sincronizando`);
        continue;
      }
      
      // Verificar número do bloco
      const blockNumber = await retryOperation(() => web3.eth.getBlockNumber());
      console.log(`✅ ${minerName}: Nó pronto, bloco atual: ${blockNumber}`);
      
      // Verificar se está minerando
      try {
        const mining = await retryOperation(() => web3.eth.isMining());
        console.log(`${mining ? '⛏️' : '⚠️'} ${minerName}: Mineração ${mining ? 'ativa' : 'inativa'}`);
      } catch (err) {
        console.warn(`⚠️ ${minerName}: Não foi possível verificar status de mineração: ${err.message}`);
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao verificar prontidão: ${err.message}`);
    }
  }
}

// Descobrir master accounts para cada minerador
async function discoverMasterAccounts() {
  console.log('🔍 Descobrindo contas master para cada minerador...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    try {
      // Obter a primeira conta (índice 0) que é a master
      const minerAccounts = await retryOperation(() => web3.eth.getAccounts());
      
      if (minerAccounts && minerAccounts.length > 0) {
        masterAccounts[minerName] = minerAccounts[0];
        console.log(`✅ ${minerName}: Master account = ${minerAccounts[0]}`);
        
        // Verificar saldo
        const balance = await retryOperation(() => web3.eth.getBalance(minerAccounts[0]));
        const balanceEth = web3.utils.fromWei(balance, 'ether');
        console.log(`💰 ${minerName}: Saldo = ${balanceEth} ETH`);
        
        // Desbloquear a master account por um longo período
        try {
          await retryOperation(() => web3.eth.personal.unlockAccount(minerAccounts[0], PASSWORD, 0));
          console.log(`🔓 ${minerName}: Master account desbloqueada permanentemente`);
        } catch (unlockErr) {
          console.warn(`⚠️ ${minerName}: Não foi possível desbloquear master account: ${unlockErr.message}`);
        }
      } else {
        console.warn(`⚠️ ${minerName}: Nenhuma conta encontrada!`);
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao obter contas: ${err.message}`);
    }
  }
}

// Verificar contas existentes em cada minerador
async function checkExistingAccounts() {
  console.log('🔍 Verificando contas existentes em cada minerador...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    try {
      // Obtém todas as contas existentes
      const existingAccounts = await retryOperation(() => web3.eth.getAccounts());
      accounts[minerName] = existingAccounts;
      
      console.log(`✅ ${minerName}: Encontradas ${existingAccounts.length} contas`);
      
      // Desbloquear as contas permanentemente (0 = sem timeout)
      for (const account of existingAccounts) {
        try {
          await retryOperation(() => web3.eth.personal.unlockAccount(account, PASSWORD, 0));
          console.log(`🔓 ${minerName}: Conta ${account.substring(0, 10)}... desbloqueada permanentemente`);
        } catch (unlockErr) {
          console.warn(`⚠️ ${minerName}: Não foi possível desbloquear ${account.substring(0, 10)}...: ${unlockErr.message}`);
        }
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao verificar contas existentes: ${err.message}`);
    }
  }
}

// Criar contas adicionais se necessário
async function createAdditionalAccounts() {
  console.log('🔧 Verificando necessidade de criar contas adicionais...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    // Verificar quantas contas precisam ser criadas
    const existingAccounts = accounts[minerName] || [];
    const accountsNeeded = Math.max(0, accountsPerMiner - existingAccounts.length);
    
    if (accountsNeeded === 0) {
      console.log(`✅ ${minerName}: Já tem ${existingAccounts.length} contas, não precisa criar mais`);
      continue;
    }
    
    console.log(`🔧 ${minerName}: Criando ${accountsNeeded} contas adicionais...`);
    
    // Criar novas contas
    const newAccounts = [];
    for (let j = 0; j < accountsNeeded; j++) {
      try {
        const newAccount = await retryOperation(
          () => web3.eth.personal.newAccount(PASSWORD)
        );
        
        newAccounts.push(newAccount);
        console.log(`✅ ${minerName}: Criada conta ${j+1}/${accountsNeeded}: ${newAccount.substring(0, 10)}...`);
        
        // Desbloquear a nova conta permanentemente
        await retryOperation(
          () => web3.eth.personal.unlockAccount(newAccount, PASSWORD, 0)
        );
        console.log(`🔓 ${minerName}: Nova conta ${newAccount.substring(0, 10)}... desbloqueada permanentemente`);
        
        // Pausa breve entre criações de contas
        await sleep(500);
      } catch (err) {
        console.error(`❌ ${minerName}: Erro ao criar conta: ${err.message}`);
      }
    }
    
    // Atualizar a lista de contas
    if (newAccounts.length > 0) {
      accounts[minerName] = [...existingAccounts, ...newAccounts];
      console.log(`✅ ${minerName}: Agora tem ${accounts[minerName].length} contas`);
    }
  }
}

// Financiar contas com ETH
async function fundAccounts() {
  console.log('💰 Financiando contas...');
  
  // Contagem de transações de financiamento
  let fundingTransactions = 0;
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    const masterAccount = masterAccounts[minerName];
    
    if (!masterAccount) {
      console.warn(`⚠️ ${minerName}: Sem master account disponível`);
      continue;
    }
    
    // Verificar saldo da master account
    try {
      const masterBalance = await retryOperation(() => web3.eth.getBalance(masterAccount));
      const masterBalanceEth = web3.utils.fromWei(masterBalance, 'ether');
      console.log(`💰 ${minerName}: Master account tem ${masterBalanceEth} ETH`);
      
      // Verificar se a master account está desbloqueada
      try {
        await retryOperation(() => web3.eth.personal.unlockAccount(masterAccount, PASSWORD, 0));
        console.log(`🔓 ${minerName}: Master account desbloqueada novamente para financiamento`);
      } catch (unlockErr) {
        console.warn(`⚠️ ${minerName}: Não foi possível desbloquear master account: ${unlockErr.message}`);
      }
      
      // Financiar outras contas
      const minerAccounts = accounts[minerName] || [];
      for (let j = 0; j < minerAccounts.length; j++) {
        const account = minerAccounts[j];
        
        // Não financiar a master account
        if (account === masterAccount) {
          continue;
        }
        
        // Verificar saldo atual
        const balance = await retryOperation(() => web3.eth.getBalance(account));
        const balanceEth = web3.utils.fromWei(balance, 'ether');
        
        // Se o saldo for menor que 1 ETH, enviar mais
        if (parseFloat(balanceEth) < 1) {
          console.log(`💰 ${minerName}: Conta ${account.substring(0, 10)}... tem apenas ${balanceEth} ETH, financiando...`);
          
          // Enviar ETH
          const amountToSend = '5'; // 5 ETH
          try {
            // Usar um gas price mais alto para priorizar transações de financiamento
            const tx = {
              from: masterAccount,
              to: account,
              value: web3.utils.toWei(amountToSend, 'ether'),
              gas: 21000,
              gasPrice: web3.utils.toWei('10', 'gwei') // Gas price mais alto
            };
            
            const receipt = await retryOperation(() => web3.eth.sendTransaction(tx));
            
            console.log(`✅ ${minerName}: Enviado ${amountToSend} ETH para ${account.substring(0, 10)}...`);
            fundingTransactions++;
            
            // Adicionar ao histórico
            transactionHistory.push({
              type: 'funding',
              from: masterAccount,
              to: account,
              value: amountToSend,
              timestamp: Date.now(),
              hash: receipt.transactionHash
            });
            
            // Pequena pausa entre financiamentos
            await sleep(1000);
          } catch (txErr) {
            console.error(`❌ ${minerName}: Erro ao financiar conta: ${txErr.message}`);
          }
        } else {
          console.log(`✅ ${minerName}: Conta ${account.substring(0, 10)}... já tem ${balanceEth} ETH`);
        }
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao verificar saldo: ${err.message}`);
    }
  }
  
  // Salvar histórico de transações
  saveTransactionHistory();
  
  // Se houver transações de financiamento, aguardar um tempo para que sejam processadas
  if (fundingTransactions > 0) {
    console.log(`⏳ Aguardando 60 segundos para que as ${fundingTransactions} transações de financiamento sejam processadas...`);
    await sleep(60000); // 60 segundos
  }
}

// Verificar saldos atualizados
async function verifyBalances() {
  console.log('🔍 Verificando saldos após financiamento...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    const minerAccounts = accounts[minerName] || [];
    
    console.log(`\n📊 ${minerName}: Saldos atuais:`);
    
    for (let j = 0; j < minerAccounts.length; j++) {
      const account = minerAccounts[j];
      try {
        const balance = await retryOperation(() => web3.eth.getBalance(account));
        const balanceEth = web3.utils.fromWei(balance, 'ether');
        console.log(`  ${account}: ${balanceEth} ETH`);
      } catch (err) {
        console.warn(`  ${account}: Erro ao verificar saldo: ${err.message}`);
      }
    }
  }
}

// Função para selecionar um minerador e contas para uma transação
function selectMinerAndAccounts() {
  // Lista de mineradores disponíveis (com pelo menos 2 contas)
  const availableMiners = minerNames.filter(name => accounts[name] && accounts[name].length >= 2);
  
  if (availableMiners.length === 0) {
    return { success: false, message: `Nenhum minerador tem contas suficientes` };
  }
  
  // Escolhe um minerador aleatório
  const minerIndex = Math.floor(Math.random() * availableMiners.length);
  const minerName = availableMiners[minerIndex];
  const web3 = web3Instances[minerName];
  
  const availableAccounts = accounts[minerName];
  
  // Escolhe duas contas diferentes
  const fromIndex = Math.floor(Math.random() * availableAccounts.length);
  let toIndex;
  do {
    toIndex = Math.floor(Math.random() * availableAccounts.length);
  } while (toIndex === fromIndex);
  
  return {
    success: true,
    minerName,
    web3,
    from: availableAccounts[fromIndex],
    to: availableAccounts[toIndex]
  };
}

// Enviar transação
async function sendTransaction() {
  // Seleciona minerador e contas
  const selection = selectMinerAndAccounts();
  
  if (!selection.success) {
    console.warn(`⚠️ ${selection.message}`);
    return false;
  }
  
  const { minerName, web3, from, to } = selection;
  
  try {
    // Verificar saldo
    const balance = await retryOperation(() => web3.eth.getBalance(from));
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    
    if (parseFloat(balanceEth) < 0.01) {
      console.warn(`⚠️ ${minerName}: Saldo insuficiente em ${from.substring(0, 8)}...`);
      return false;
    }
    
    // Não precisamos desbloquear novamente pois desbloqueamos permanentemente antes
    
    // Obter nonce para evitar problemas de substituição de transação
    const nonce = await retryOperation(() => web3.eth.getTransactionCount(from, 'pending'));
    
    // Enviar transação com valor pequeno e gas price baixo (não precisa ser processada rapidamente)
    const tx = {
      from,
      to,
      value: web3.utils.toWei('0.0001', 'ether'),
      gas: 21000,
      gasPrice: web3.utils.toWei('1', 'gwei'),
      nonce
    };
    
    // Enviar e esperar pelo receipt
    const receipt = await retryOperation(() => {
      return new Promise((resolve, reject) => {
        web3.eth.sendTransaction(tx)
          .on('receipt', (receipt) => {
            resolve(receipt);
          })
          .on('error', (error) => {
            reject(error);
          });
      });
    });
    
    console.log(`✅ ${minerName}: ${from.substring(0, 8)}... → ${to.substring(0, 8)}... (${receipt.transactionHash.substring(0, 8)}...)`);
    
    // Atualizar estatísticas
    stats.totalTransactions++;
    stats.successfulTransactions++;
    stats.totalGasUsed += receipt.gasUsed;
    
    // Adicionar ao histórico
    transactionHistory.push({
      type: 'transfer',
      from,
      to,
      value: '0.0001',
      timestamp: Date.now(),
      hash: receipt.transactionHash,
      minerName
    });
    
    return true;
  } catch (err) {
    console.error(`❌ ${minerName}: Erro na transação: ${err.message}`);
    stats.totalTransactions++;
    stats.failedTransactions++;
    return false;
  }
}

// Imprime estatísticas
function printStats() {
  if (!stats.startTime) return;
  
  const elapsedSeconds = (Date.now() - stats.startTime) / 1000;
  const tps = stats.successfulTransactions / elapsedSeconds;
  const successRate = stats.totalTransactions > 0 ? (stats.successfulTransactions / stats.totalTransactions * 100) : 0;
  
  console.log("\n=== ESTATÍSTICAS ===");
  console.log(`⏱️  Tempo: ${elapsedSeconds.toFixed(0)}s`);
  console.log(`✅ Sucesso: ${stats.successfulTransactions}`);
  console.log(`❌ Falhas: ${stats.failedTransactions}`);
  console.log(`🚀 TPS: ${tps.toFixed(3)}`);
  console.log(`📈 Taxa de sucesso: ${successRate.toFixed(0)}%`);
  
  // Exibe estatísticas por minerador
  console.log("\n=== CONTAS POR MINERADOR ===");
  minerNames.forEach(minerName => {
    console.log(`${minerName}: ${accounts[minerName] ? accounts[minerName].length : 0} contas`);
  });
  
  console.log("\n=== MASTER ACCOUNTS ===");
  Object.entries(masterAccounts).forEach(([minerName, account]) => {
    console.log(`${minerName}: ${account || 'Não descoberta'}`);
  });
  
  console.log("==================\n");
}

// Função principal
async function simulateRealTraffic() {
  try {
    console.log('🚀 Iniciando simulação de tráfego Ethereum...');
    
    // Carregar histórico anterior de transações
    loadTransactionHistory();
    
    // Inicializar Web3 para todos os mineradores
    initializeWeb3Instances();
    
    // Verificar se os mineradores estão prontos
    await checkMinersReady();
    
    // Descobrir master accounts
    await discoverMasterAccounts();
    
    // Verificar contas existentes
    await checkExistingAccounts();
    
    // Criar contas adicionais se necessário
    await createAdditionalAccounts();
    
    // Financiar contas
    await fundAccounts();
    
    // Verificar saldos após financiamento
    await verifyBalances();
    
    // Verificar se temos pelo menos um minerador com contas suficientes
    let hasEnoughAccounts = false;
    for (const minerName of minerNames) {
      if (accounts[minerName] && accounts[minerName].length >= 2) {
        hasEnoughAccounts = true;
        break;
      }
    }
    
    if (!hasEnoughAccounts) {
      console.error('❌ Não há contas suficientes para realizar transações');
      return;
    }
    
    // Inicia simulação
    console.log('🚀 Iniciando transações...');
    stats.startTime = Date.now();
    
    // Iniciar intervalo para salvar histórico regularmente
    const saveInterval = setInterval(() => {
      saveTransactionHistory();
    }, 60000); // Salva o histórico a cada 1 minuto
    
    const txInterval = setInterval(async () => {
      await sendTransaction();
      
      // Verificar periodicamente os saldos e reabastecer se necessário
      if (stats.totalTransactions % 50 === 0 && stats.totalTransactions > 0) {
        await fundAccounts();
      }
    }, transactionFrequency);
    
    const statsInterval = setInterval(() => {
      printStats();
    }, 10000);
    
    // Manipulador para encerrar
    process.on('SIGINT', () => {
      console.log('\n🛑 Encerrando...');
      clearInterval(txInterval);
      clearInterval(statsInterval);
      clearInterval(saveInterval);
      printStats();
      saveTransactionHistory();
      console.log('💾 Histórico de transações salvo.');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

// Inicia a simulação
simulateRealTraffic();