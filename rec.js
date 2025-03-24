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

// Armazena todas as contas
let accounts = {
  miner1: [],
  miner2: [],
  miner3: [],
  miner4: [],
  miner5: []
};

// Armazena histórico de todas as transações
const transactionHistory = [];

// Inicializa o Web3 com timeout maior
function createWeb3Instance(url) {
  const provider = new Web3.providers.HttpProvider(url, {
    timeout: 20000, // Aumentado para 20 segundos
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

// Função para esperar
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Desbloquear uma conta
async function unlockAccount(minerName, account, password = '12345', duration = 36000) {
  const web3 = web3Instances[minerName];
  
  try {
    const unlocked = await web3.eth.personal.unlockAccount(account, password, duration);
    return unlocked;
  } catch (err) {
    console.warn(`⚠️ Não foi possível desbloquear a conta ${account.substring(0, 8)}... no ${minerName}: ${err.message}`);
    return false;
  }
}

// Verificar saldo de uma conta
async function checkBalance(minerName, account) {
  const web3 = web3Instances[minerName];
  
  try {
    const balance = await web3.eth.getBalance(account);
    return {
      wei: balance,
      ether: web3.utils.fromWei(balance, 'ether')
    };
  } catch (err) {
    console.warn(`⚠️ Erro ao verificar saldo de ${account.substring(0, 8)}... no ${minerName}: ${err.message}`);
    return { wei: '0', ether: '0' };
  }
}

// Descobrir contas para cada minerador
async function discoverAccounts() {
  console.log('🔍 Descobrindo contas em cada minerador...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    
    try {
      // Obter todas as contas
      const minerAccounts = await web3.eth.getAccounts();
      accounts[minerName] = minerAccounts;
      
      console.log(`✅ ${minerName}: Encontradas ${minerAccounts.length} contas`);
      
      // Verificar se a master account está na lista
      const masterAccount = masterAccounts[minerName];
      if (masterAccount && minerAccounts.includes(masterAccount)) {
        console.log(`✅ ${minerName}: Master account ${masterAccount.substring(0, 8)}... encontrada`);
        
        // Desbloquear a master account para operações futuras
        const unlocked = await unlockAccount(minerName, masterAccount);
        if (unlocked) {
          console.log(`🔓 ${minerName}: Master account desbloqueada com sucesso`);
        }
        
        // Verificar saldo da master account
        const balance = await checkBalance(minerName, masterAccount);
        console.log(`💰 ${minerName}: Master account tem ${balance.ether} ETH`);
      } else if (masterAccount) {
        console.warn(`⚠️ ${minerName}: Master account ${masterAccount.substring(0, 8)}... não encontrada na lista de contas!`);
      }
    } catch (err) {
      console.error(`❌ ${minerName}: Erro ao descobrir contas: ${err.message}`);
    }
  }
}

// Criar mais contas se necessário
async function createAdditionalAccounts(targetAccountsPerMiner = 5) {
  console.log('\n🔧 Verificando se é necessário criar contas adicionais...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    const currentAccounts = accounts[minerName];
    
    if (!currentAccounts) {
      console.warn(`⚠️ ${minerName}: Sem lista de contas disponível`);
      continue;
    }
    
    const accountsNeeded = targetAccountsPerMiner - currentAccounts.length;
    
    if (accountsNeeded <= 0) {
      console.log(`✅ ${minerName}: Já possui ${currentAccounts.length} contas, não é necessário criar mais`);
      continue;
    }
    
    console.log(`🔧 ${minerName}: Criando ${accountsNeeded} contas adicionais...`);
    
    const newAccounts = [];
    for (let j = 0; j < accountsNeeded; j++) {
      try {
        const newAccount = await web3.eth.personal.newAccount('12345');
        newAccounts.push(newAccount);
        console.log(`✅ ${minerName}: Criada conta ${newAccount.substring(0, 8)}...`);
        
        // Garantir que a conta seja desbloqueada
        await unlockAccount(minerName, newAccount);
      } catch (err) {
        console.error(`❌ ${minerName}: Erro ao criar nova conta: ${err.message}`);
      }
    }
    
    // Atualizar a lista de contas
    if (newAccounts.length > 0) {
      accounts[minerName] = [...currentAccounts, ...newAccounts];
      console.log(`✅ ${minerName}: Agora possui ${accounts[minerName].length} contas`);
    }
  }
}

// Abastecer todas as contas a partir da master account ou miner
async function fundAccounts(targetBalanceEth = 20) {
  console.log('\n💰 Abastecendo contas com ETH...');
  
  for (let i = 0; i < minerNames.length; i++) {
    const minerName = minerNames[i];
    const web3 = web3Instances[minerName];
    const masterAccount = masterAccounts[minerName];
    const minerAccounts = accounts[minerName];
    
    if (!masterAccount || !minerAccounts || minerAccounts.length === 0) {
      console.warn(`⚠️ ${minerName}: Sem master account ou contas para abastecer`);
      continue;
    }
    
    // Verificar saldo da master account
    const masterBalance = await checkBalance(minerName, masterAccount);
    console.log(`💰 ${minerName}: Master account tem ${masterBalance.ether} ETH`);
    
    // Verificar se master account tem ETH suficiente para abastecer as outras contas
    if (parseFloat(masterBalance.ether) < 0.1) {
      console.warn(`⚠️ ${minerName}: Master account não tem ETH suficiente para abastecer outras contas`);
      
      // Verificar se é possível minerar para obter mais ETH
      try {
        const mining = await web3.eth.isMining();
        if (!mining) {
          // Iniciar mineração
          console.log(`⛏️ ${minerName}: Tentando iniciar mineração para gerar ETH...`);
          try {
            await web3.eth.miner.start(1);
            console.log(`⛏️ ${minerName}: Mineração iniciada`);
            
            // Aguardar um tempo para minerar alguns blocos
            console.log(`⏳ ${minerName}: Aguardando 30 segundos para minerar blocos...`);
            await sleep(30000);
            
            // Verificar saldo novamente após mineração
            const newMasterBalance = await checkBalance(minerName, masterAccount);
            console.log(`💰 ${minerName}: Master account agora tem ${newMasterBalance.ether} ETH após mineração`);
            
            // Parar mineração
            await web3.eth.miner.stop();
            console.log(`⛏️ ${minerName}: Mineração interrompida`);
          } catch (miningErr) {
            console.warn(`⚠️ ${minerName}: Erro ao iniciar/parar mineração: ${miningErr.message}`);
          }
        } else {
          console.log(`⛏️ ${minerName}: Mineração já está ativa`);
          // Aguardar um tempo para minerar mais blocos
          console.log(`⏳ ${minerName}: Aguardando 15 segundos para continuar mineração...`);
          await sleep(15000);
        }
      } catch (miningCheckErr) {
        console.warn(`⚠️ ${minerName}: Erro ao verificar mineração: ${miningCheckErr.message}`);
      }
    }
    
    // Abastecer cada conta (exceto a master) que precisa de ETH
    for (let j = 0; j < minerAccounts.length; j++) {
      const account = minerAccounts[j];
      
      // Pular a master account
      if (account === masterAccount) {
        continue;
      }
      
      // Verificar saldo atual
      const balance = await checkBalance(minerName, account);
      console.log(`📊 ${minerName}: Conta ${account.substring(0, 8)}... tem ${balance.ether} ETH`);
      
      // Verificar se precisa abastecer
      if (parseFloat(balance.ether) < targetBalanceEth) {
        const amountToSend = targetBalanceEth - parseFloat(balance.ether);
        console.log(`🔄 ${minerName}: Transferindo ${amountToSend} ETH para ${account.substring(0, 8)}...`);
        
        // Verificar saldo atual da master
        const currentMasterBalance = await checkBalance(minerName, masterAccount);
        
        if (parseFloat(currentMasterBalance.ether) < amountToSend) {
          console.warn(`⚠️ ${minerName}: Master account não tem ETH suficiente (${currentMasterBalance.ether}) para enviar ${amountToSend} ETH`);
          continue;
        }
        
        // Desbloquear master account
        await unlockAccount(minerName, masterAccount);
        
        // Enviar ETH
        try {
          const tx = {
            from: masterAccount,
            to: account,
            value: web3.utils.toWei(amountToSend.toString(), 'ether'),
            gas: 21000,
            gasPrice: web3.utils.toWei('1', 'gwei')
          };
          
          const receipt = await web3.eth.sendTransaction(tx);
          console.log(`✅ ${minerName}: Transferência concluída, hash: ${receipt.transactionHash.substring(0, 10)}...`);
          
          // Registrar transação no histórico
          transactionHistory.push({
            timestamp: Date.now(),
            type: 'fund',
            from: masterAccount,
            to: account,
            value: amountToSend,
            minerName,
            txHash: receipt.transactionHash,
            gasUsed: receipt.gasUsed
          });
          
          // Verificar novo saldo
          const newBalance = await checkBalance(minerName, account);
          console.log(`📊 ${minerName}: Conta ${account.substring(0, 8)}... agora tem ${newBalance.ether} ETH`);
          
          // Pequena pausa entre transações
          await sleep(500);
        } catch (txErr) {
          console.error(`❌ ${minerName}: Erro ao transferir ETH: ${txErr.message}`);
        }
      } else {
        console.log(`✅ ${minerName}: Conta ${account.substring(0, 8)}... já tem saldo suficiente (${balance.ether} ETH)`);
      }
    }
  }
}

// Monitorar transações para detectar problemas
async function monitorTransactions(durationMinutes = 5) {
  console.log(`\n🔍 Monitorando transações por ${durationMinutes} minutos...`);
  
  const startTime = Date.now();
  const endTime = startTime + (durationMinutes * 60 * 1000);
  
  // Escolher um minerador para monitorar
  const minerName = minerNames[0];
  const web3 = web3Instances[minerName];
  
  let lastBlockNumber = await web3.eth.getBlockNumber();
  console.log(`📦 Bloco inicial: ${lastBlockNumber}`);
  
  // Estatísticas
  const stats = {
    blocksProcessed: 0,
    transactionsFound: 0,
    largeValueTransactions: 0,
    unknownAddressTransactions: 0
  };
  
  // Lista de endereços conhecidos (todas as contas em todos os mineradores)
  const knownAddresses = new Set();
  Object.values(accounts).forEach(accountList => {
    accountList.forEach(account => knownAddresses.add(account.toLowerCase()));
  });
  
  // Adicionar as master accounts
  Object.values(masterAccounts).forEach(account => {
    if (account) knownAddresses.add(account.toLowerCase());
  });
  
  console.log(`👥 Monitorando ${knownAddresses.size} endereços conhecidos`);
  
  while (Date.now() < endTime) {
    try {
      // Verificar novos blocos
      const currentBlockNumber = await web3.eth.getBlockNumber();
      
      if (currentBlockNumber > lastBlockNumber) {
        console.log(`\n📦 Detectados ${currentBlockNumber - lastBlockNumber} novos blocos`);
        
        // Processar cada novo bloco
        for (let blockNumber = lastBlockNumber + 1; blockNumber <= currentBlockNumber; blockNumber++) {
          const block = await web3.eth.getBlock(blockNumber, true);
          stats.blocksProcessed++;
          
          console.log(`📦 Analisando bloco #${blockNumber}, minerado por ${block.miner.substring(0, 8)}...`);
          
          if (block.transactions.length === 0) {
            console.log(`  💸 Nenhuma transação neste bloco`);
            continue;
          }
          
          console.log(`  💸 ${block.transactions.length} transações encontradas`);
          stats.transactionsFound += block.transactions.length;
          
          // Analisar cada transação
          for (const tx of block.transactions) {
            const fromAddress = tx.from.toLowerCase();
            const toAddress = tx.to ? tx.to.toLowerCase() : 'contract-creation';
            const valueEth = web3.utils.fromWei(tx.value, 'ether');
            
            // Verificar se os endereços são conhecidos
            const isFromKnown = knownAddresses.has(fromAddress);
            const isToKnown = toAddress === 'contract-creation' || knownAddresses.has(toAddress);
            
            // Verificar transações grandes (mais de 5 ETH)
            const isLargeValue = parseFloat(valueEth) > 5;
            
            if (isLargeValue) {
              console.log(`  ⚠️ Transação de valor alto: ${valueEth} ETH de ${tx.from.substring(0, 8)}... para ${toAddress === 'contract-creation' ? 'criação de contrato' : tx.to.substring(0, 8)}...`);
              stats.largeValueTransactions++;
            }
            
            if (!isFromKnown || !isToKnown) {
              console.log(`  ⚠️ Transação com endereço desconhecido: ${tx.hash.substring(0, 8)}...`);
              stats.unknownAddressTransactions++;
              
              if (!isFromKnown) {
                console.log(`    📤 Remetente desconhecido: ${tx.from}`);
              }
              
              if (!isToKnown && toAddress !== 'contract-creation') {
                console.log(`    📥 Destinatário desconhecido: ${tx.to}`);
              }
              
              console.log(`    💰 Valor: ${valueEth} ETH`);
            }
          }
        }
        
        lastBlockNumber = currentBlockNumber;
      } else {
        process.stdout.write('.');
      }
      
      // Aguardar um pouco antes de verificar novamente
      await sleep(5000);
    } catch (err) {
      console.error(`❌ Erro ao monitorar transações: ${err.message}`);
      await sleep(5000);
    }
  }
  
  console.log('\n📊 Estatísticas de monitoramento:');
  console.log(`  📦 Blocos processados: ${stats.blocksProcessed}`);
  console.log(`  💸 Transações encontradas: ${stats.transactionsFound}`);
  console.log(`  ⚠️ Transações de valor alto: ${stats.largeValueTransactions}`);
  console.log(`  ⚠️ Transações com endereços desconhecidos: ${stats.unknownAddressTransactions}`);
}

// Função principal
async function recoverNetwork() {
  try {
    console.log('🚀 Iniciando recuperação da rede...');
    
    // Inicializar Web3 para todos os mineradores
    initializeWeb3Instances();
    
    // Descobrir contas
    await discoverAccounts();
    
    // Criar contas adicionais se necessário
    await createAdditionalAccounts();
    
    // Abastecer todas as contas
    await fundAccounts();
    
    // Monitorar transações por um período para detectar problemas
    await monitorTransactions(2);
    
    console.log('\n✅ Processo de recuperação concluído!');
    
  } catch (error) {
    console.error('❌ Erro fatal:', error);
  }
}

// Inicia o processo de recuperação
recoverNetwork();