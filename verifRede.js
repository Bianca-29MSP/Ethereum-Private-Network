const Web3 = require('web3');

// URLs dos mineradores
const minerUrls = [
  'http://localhost:8545',
  'http://localhost:8546',
  'http://localhost:8547',
  'http://localhost:8548',
  'http://localhost:8549'
];
const minerNames = ['miner1', 'miner2', 'miner3', 'miner4', 'miner5'];

// Master accounts para cada minerador
const masterAccounts = {
  miner1: '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061',
  miner2: '0xa772f976e4E4D53D738fAE5493385a41d1DC8599',
  miner3: '0xc5803Ca9b9Ff136855C287b1515D5565139926d3',
  miner4: '0x9DA6D31B1b600e0e3c66f1D063F3464eeF8f2a82',
  miner5: '0x06fd657C34e3213d3a8de5dfb4033b369F2Bd0Fb'
};

// Armazena conexões Web3 para cada minerador
const web3Instances = {};

// Inicializa o Web3 com timeout maior
function createWeb3Instance(url) {
  const provider = new Web3.providers.HttpProvider(url, {
    timeout: 10000,
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

// Verificar status de cada nó minerador
async function checkMinersStatus() {
  console.log('🔍 Verificando status de cada minerador...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    try {
      // Verificar se o nó está sincronizado
      const syncing = await web3.eth.isSyncing();
      const blockNumber = await web3.eth.getBlockNumber();
      
      console.log(`🏷️ ${minerName}:`);
      console.log(`  📦 Bloco atual: ${blockNumber}`);
      console.log(`  🔄 Sincronizando: ${syncing ? 'Sim' : 'Não'}`);
      
      // Verificar peers
      try {
        const peers = await web3.eth.net.getPeerCount();
        console.log(`  👥 Peers conectados: ${peers}`);
      } catch (err) {
        console.log(`  👥 Peers conectados: Não foi possível verificar (${err.message})`);
      }
      
      // Verificar se a mineração está ativa
      try {
        const mining = await web3.eth.isMining();
        console.log(`  ⛏️ Mineração ativa: ${mining ? 'Sim' : 'Não'}`);
      } catch (err) {
        console.log(`  ⛏️ Mineração ativa: Não foi possível verificar (${err.message})`);
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao verificar status: ${err.message}`);
    }
  }
}

// Verificar saldos de todas as contas conhecidas
async function checkAllBalances() {
  console.log('\n💰 Verificando saldos das contas master...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    const masterAccount = masterAccounts[minerName];
    
    if (!masterAccount) {
      console.warn(`⚠️ ${minerName}: Sem master account disponível para verificar`);
      continue;
    }
    
    try {
      // Verificar saldo da master account
      const balance = await web3.eth.getBalance(masterAccount);
      const balanceEth = web3.utils.fromWei(balance, 'ether');
      console.log(`💰 ${minerName}: Master account ${masterAccount} = ${balanceEth} ETH`);
      
      // Obter todas as contas e seus saldos
      const accounts = await web3.eth.getAccounts();
      console.log(`👛 ${minerName}: Total de ${accounts.length} contas`);
      
      // Verificar saldo detalhado de todas as contas
      console.log(`\n📊 ${minerName}: Detalhes de todas as contas:`);
      
      // Processar em lotes para não sobrecarregar
      const batchSize = 5;
      for (let j = 0; j < accounts.length; j += batchSize) {
        const batch = accounts.slice(j, j + batchSize);
        
        const results = await Promise.all(batch.map(async (acc) => {
          try {
            const accBalance = await web3.eth.getBalance(acc);
            const accBalanceEth = web3.utils.fromWei(accBalance, 'ether');
            return { account: acc, balance: accBalanceEth };
          } catch (err) {
            return { account: acc, balance: "ERRO", error: err.message };
          }
        }));
        
        results.forEach(result => {
          if (result.error) {
            console.log(`  ${result.account}: ERRO - ${result.error}`);
          } else {
            console.log(`  ${result.account}: ${result.balance} ETH`);
          }
        });
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao verificar saldos: ${err.message}`);
    }
  }
}

// Verificar últimas transações
async function checkRecentTransactions() {
  console.log('\n🔍 Verificando transações recentes...');
  
  // Escolhe um minerador para verificar (o primeiro disponível)
  let web3 = null;
  let minerName = null;
  
  for (let i = 0; i < minerNames.length; i++) {
    try {
      minerName = minerNames[i];
      web3 = web3Instances[minerName];
      
      // Tenta executar uma operação simples para verificar se está funcionando
      await web3.eth.getBlockNumber();
      break;
    } catch (err) {
      console.warn(`⚠️ Não foi possível conectar ao ${minerName}: ${err.message}`);
      web3 = null;
      minerName = null;
    }
  }
  
  if (!web3) {
    console.error('❌ Não foi possível conectar a nenhum minerador para verificar transações');
    return;
  }
  
  try {
    // Obtém o número do bloco atual
    const currentBlock = await web3.eth.getBlockNumber();
    console.log(`📦 Bloco atual: ${currentBlock}`);
    
    // Verificar os últimos 10 blocos ou menos, se a blockchain for nova
    const startBlock = Math.max(0, currentBlock - 9);
    console.log(`🔍 Verificando blocos de ${startBlock} até ${currentBlock}...`);
    
    for (let blockNumber = startBlock; blockNumber <= currentBlock; blockNumber++) {
      const block = await web3.eth.getBlock(blockNumber, true);
      
      console.log(`\n📦 Bloco #${blockNumber}:`);
      console.log(`  ⏰ Timestamp: ${new Date(block.timestamp * 1000).toLocaleString()}`);
      console.log(`  🧩 Hash: ${block.hash}`);
      console.log(`  ⛏️ Minerador: ${block.miner}`);
      
      if (block.transactions.length === 0) {
        console.log(`  💸 Transações: Nenhuma`);
        continue;
      }
      
      console.log(`  💸 Transações (${block.transactions.length}):`);
      
      for (const tx of block.transactions) {
        console.log(`    ${tx.hash}:`);
        console.log(`      De: ${tx.from}`);
        console.log(`      Para: ${tx.to}`);
        console.log(`      Valor: ${web3.utils.fromWei(tx.value, 'ether')} ETH`);
        console.log(`      Gas Price: ${web3.utils.fromWei(tx.gasPrice, 'gwei')} gwei`);
        console.log(`      Gas Usado: ${tx.gas}`);
      }
    }
  } catch (err) {
    console.error(`❌ Erro ao verificar transações recentes: ${err.message}`);
  }
}

// Verificar estado da rede
async function checkNetworkState() {
  console.log('\n🌐 Verificando estado da rede Ethereum...');
  
  // Verificar rede
  try {
    const minerName = minerNames[0];
    const web3 = web3Instances[minerName];
    
    const networkId = await web3.eth.net.getId();
    const networkType = await web3.eth.net.getNetworkType();
    
    console.log(`🌐 ID da Rede: ${networkId}`);
    console.log(`🌐 Tipo de Rede: ${networkType}`);
    
    // Verificar se os nós estão em consenso
    console.log('\n🤝 Verificando consenso entre os nós...');
    
    const blockNumbers = [];
    const blockHashes = [];
    
    for (let i = 0; i < minerNames.length; i++) {
      const minerName = minerNames[i];
      const web3 = web3Instances[minerName];
      
      try {
        const blockNumber = await web3.eth.getBlockNumber();
        blockNumbers.push({ miner: minerName, blockNumber });
        
        const latestBlock = await web3.eth.getBlock(blockNumber);
        blockHashes.push({ miner: minerName, blockNumber, hash: latestBlock.hash });
      } catch (err) {
        console.error(`❌ ${minerName}: Erro ao verificar bloco: ${err.message}`);
      }
    }
    
    // Verificar se todos estão no mesmo bloco
    const uniqueBlockNumbers = new Set(blockNumbers.map(item => item.blockNumber));
    if (uniqueBlockNumbers.size === 1) {
      console.log(`✅ Todos os nós estão no mesmo bloco: ${blockNumbers[0].blockNumber}`);
    } else {
      console.warn(`⚠️ Os nós estão em blocos diferentes:`);
      blockNumbers.forEach(item => {
        console.log(`  ${item.miner}: Bloco #${item.blockNumber}`);
      });
    }
    
    // Verificar se os hashes dos blocos são iguais
    const blocksByNumber = {};
    blockHashes.forEach(item => {
      if (!blocksByNumber[item.blockNumber]) {
        blocksByNumber[item.blockNumber] = [];
      }
      blocksByNumber[item.blockNumber].push(item);
    });
    
    let consensusProblem = false;
    Object.keys(blocksByNumber).forEach(blockNumber => {
      const blocks = blocksByNumber[blockNumber];
      if (blocks.length > 1) {
        const hashes = new Set(blocks.map(block => block.hash));
        if (hashes.size > 1) {
          consensusProblem = true;
          console.warn(`⚠️ Problema de consenso no bloco #${blockNumber}:`);
          blocks.forEach(block => {
            console.log(`  ${block.miner}: Hash ${block.hash}`);
          });
        }
      }
    });
    
    if (!consensusProblem && blockHashes.length > 1) {
      console.log(`✅ Todos os nós estão em consenso`);
    }
    
  } catch (err) {
    console.error(`❌ Erro ao verificar estado da rede: ${err.message}`);
  }
}

// Função principal
async function checkEthereumNetwork() {
  try {
    console.log('🚀 Iniciando verificação da rede Ethereum privada...');
    
    // Inicializar Web3 para todos os mineradores
    initializeWeb3Instances();
    
    // Verificar status dos mineradores
    await checkMinersStatus();
    
    // Verificar saldos
    await checkAllBalances();
    
    // Verificar transações recentes
    await checkRecentTransactions();
    
    // Verificar estado da rede
    await checkNetworkState();
    
    console.log('\n✅ Verificação concluída!');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

// Inicia a verificação
checkEthereumNetwork();