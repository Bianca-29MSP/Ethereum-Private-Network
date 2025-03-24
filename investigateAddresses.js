const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// Endereços que você quer investigar
const masterAccount = '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061';
const toAccount = '0x581785e3623a064303245406df3addd7c0a3db44';

async function investigateAccount(address) {
  console.log(`\n===== Investigando endereço: ${address} =====`);
  
  try {
    // Verificar saldo
    const balance = await web3.eth.getBalance(address);
    console.log(`Saldo: ${web3.utils.fromWei(balance, 'ether')} ETH`);
    
    // Verificar se a conta existe nos nós locais
    const accounts = await web3.eth.getAccounts();
    const isInAccounts = accounts.some(acc => acc.toLowerCase() === address.toLowerCase());
    console.log(`Conta está na lista de contas gerenciadas: ${isInAccounts ? 'Sim' : 'Não'}`);
    
    // Verificar código (para determinar se é contrato ou EOA)
    const code = await web3.eth.getCode(address);
    const isContract = code !== '0x';
    console.log(`É um contrato: ${isContract ? 'Sim' : 'Não'}`);
    
    // Verificar histórico de transações
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`Procurando transações nos últimos 100 blocos...`);
    
    let txCount = 0;
    let latestTx = null;
    
    // Verificamos os últimos 100 blocos, ou todos se tivermos menos que isso
    const startBlock = Math.max(0, blockNumber - 100);
    for (let i = startBlock; i <= blockNumber; i++) {
      const block = await web3.eth.getBlock(i, true);
      if (block && block.transactions) {
        for (const tx of block.transactions) {
          if (tx.from && tx.from.toLowerCase() === address.toLowerCase()) {
            txCount++;
            latestTx = tx;
          }
          if (tx.to && tx.to.toLowerCase() === address.toLowerCase()) {
            txCount++;
            latestTx = tx;
          }
        }
      }
    }
    
    console.log(`Número de transações encontradas: ${txCount}`);
    if (latestTx) {
      console.log(`Última transação: ${JSON.stringify(latestTx.hash)}`);
    }
    
    // Verificar nonce (número de transações enviadas)
    const nonce = await web3.eth.getTransactionCount(address);
    console.log(`Nonce (número de transações enviadas): ${nonce}`);
    
  } catch (error) {
    console.error(`Erro ao investigar conta ${address}:`, error.message);
  }
}

async function main() {
  try {
    console.log("Verificando conexão com a rede Ethereum...");
    const isListening = await web3.eth.net.isListening();
    console.log(`Conexão ativa: ${isListening}`);
    
    const networkId = await web3.eth.net.getId();
    console.log(`ID da rede: ${networkId}`);
    
    await investigateAccount(masterAccount);
    await investigateAccount(toAccount);
    
  } catch (error) {
    console.error("Erro ao conectar à rede Ethereum:", error.message);
  }
}

main();