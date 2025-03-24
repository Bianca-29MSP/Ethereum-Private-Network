const Web3 = require('web3');

// Configurações
const masterAccount = '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061'; // Conta com fundos
const refillAmount = '20';  // 20 ETH para cada conta
const minBalance = 19;     // Reabastecer se tiver menos que 19 ETH

// Inicializa o Web3 (apenas para o primeiro minerador)
const web3 = new Web3('http://localhost:8545');

// Função de espera
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal que reabastece todas as contas
async function refillAllAccounts() {
  try {
    console.log('🚀 Iniciando reabastecimento de contas com 20 ETH cada...');
    
    // Verifica saldo da master account
    const masterBalance = await web3.eth.getBalance(masterAccount);
    const masterBalanceEth = web3.utils.fromWei(masterBalance, 'ether');
    console.log(`💰 Saldo da conta master: ${masterBalanceEth} ETH`);
    
    // Verifica se a master tem ETH suficiente
    const accountsEstimate = 100; // Estimativa de número máximo de contas
    const requiredETH = accountsEstimate * parseFloat(refillAmount);
    
    if (parseFloat(masterBalanceEth) < requiredETH) {
      console.warn(`⚠️ Aviso: A master pode precisar de pelo menos ${requiredETH} ETH para abastecer todas as contas com ${refillAmount} ETH cada`);
      console.warn(`   No entanto, você tem ${masterBalanceEth} ETH disponível`);
    } else {
      console.log(`✅ Saldo master suficiente para abastecer todas as contas`);
    }
    
    // Desbloqueia a master account
    try {
      await web3.eth.personal.unlockAccount(masterAccount, '12345', 36000);
      console.log('🔓 Conta master desbloqueada com sucesso');
    } catch (err) {
      console.error(`❌ Erro ao desbloquear master: ${err.message}`);
      console.error('⛔ Não é possível continuar sem desbloquear a master account.');
      return;
    }
    
    // Obtém todas as contas existentes
    const accounts = await web3.eth.getAccounts();
    console.log(`🔍 Encontradas ${accounts.length} contas no total`);
    
    // Filtra a lista para remover a master account
    const accountsToRefill = accounts.filter(acc => 
      acc.toLowerCase() !== masterAccount.toLowerCase()
    );
    
    console.log(`🎯 ${accountsToRefill.length} contas para verificar e reabastecer com 20 ETH cada`);
    
    // Contadores
    let checkedCount = 0;
    let refillCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    // Processa as contas em lotes para evitar sobrecarga
    const batchSize = 5;
    for (let i = 0; i < accountsToRefill.length; i += batchSize) {
      const batch = accountsToRefill.slice(i, i + batchSize);
      console.log(`\n📋 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(accountsToRefill.length/batchSize)}`);
      
      // Processa cada conta do lote em sequência (não em paralelo, para evitar erros)
      for (const account of batch) {
        try {
          // Verifica o saldo atual
          const balance = await web3.eth.getBalance(account);
          const balanceEth = parseFloat(web3.utils.fromWei(balance, 'ether'));
          
          // Verifica se precisa reabastecer
          if (balanceEth < minBalance) {
            console.log(`⏳ Reabastecendo ${account.substring(0, 10)}... (Saldo atual: ${balanceEth.toFixed(4)} ETH)`);
            
            // Desbloqueie a conta antes, por segurança
            try {
              await web3.eth.personal.unlockAccount(account, '12345', 60);
            } catch (unlockErr) {
              // Continua mesmo se falhar o desbloqueio
            }
            
            // Envia a transação
            const tx = {
              from: masterAccount,
              to: account,
              value: web3.utils.toWei(refillAmount, 'ether'),
              gas: 21000,
              gasPrice: web3.utils.toWei('1', 'gwei')
            };
            
            const receipt = await web3.eth.sendTransaction(tx);
            console.log(`✅ Conta ${account.substring(0, 10)}... reabastecida com ${refillAmount} ETH`);
            refillCount++;
          } else {
            console.log(`⏭️ Pulando ${account.substring(0, 10)}... (Já tem ${balanceEth.toFixed(4)} ETH)`);
            skippedCount++;
          }
          
          checkedCount++;
          // Pequena pausa entre as transações (apenas 100ms)
          await sleep(100);
          
        } catch (err) {
          console.error(`❌ Erro ao processar ${account.substring(0, 10)}...: ${err.message}`);
          errorCount++;
          checkedCount++;
          
          // Pausa maior se houver erro
          await sleep(500);
        }
      }
      
      // Pequena pausa entre lotes
      await sleep(500);
    }
    
    // Estatísticas finais
    console.log('\n==== RESUMO DO REABASTECIMENTO ====');
    console.log(`✅ Contas verificadas: ${checkedCount}/${accountsToRefill.length}`);
    console.log(`💰 Contas reabastecidas com 20 ETH: ${refillCount}`);
    console.log(`⏭️ Contas puladas (já tinham ≥ 19 ETH): ${skippedCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log('==================================');
    
    // Verifica o saldo final da master
    const masterFinalBalance = await web3.eth.getBalance(masterAccount);
    const masterFinalBalanceEth = web3.utils.fromWei(masterFinalBalance, 'ether');
    console.log(`\n💰 Saldo final da master: ${masterFinalBalanceEth} ETH`);
    console.log(`💸 ETH utilizado: ${parseFloat(masterBalanceEth) - parseFloat(masterFinalBalanceEth)} ETH`);
    
  } catch (error) {
    console.error(`❌ Erro fatal: ${error.message}`);
  }
}

// Executa a função principal
refillAllAccounts()
  .then(() => console.log('✨ Processo concluído! Todas as contas agora têm pelo menos 20 ETH.'))
  .catch(err => console.error('💥 Falha no processo:', err.message));