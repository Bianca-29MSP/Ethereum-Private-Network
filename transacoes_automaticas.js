const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

// Configurações de contas
const masterAccount = '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061';
// Usamos a conta master como a conta de envio (fromAccount)
const fromAccount = masterAccount;
const toAccount = '0x581785e3623a064303245406df3addd7c0a3db44';

// Parâmetros da transação
const txValueEth = '0.005'; // Valor reduzido para 0.005 ETH
const gasLimit = 21000;
const gasPriceGwei = '1';

// Função para checar o saldo (em ETH)
async function checkBalance(account) {
  const balanceWei = await web3.eth.getBalance(account);
  const balanceEth = parseFloat(web3.utils.fromWei(balanceWei, 'ether'));
  return balanceEth;
}

// Função para simular o refill da conta se o saldo estiver baixo
async function refillAccountIfNeeded(account) {
  const threshold = 0.01; // Limiar de 0.01 ETH
  const balance = await checkBalance(account);
  if (balance < threshold) {
    console.warn(`⚠️ Saldo da conta ${account} é baixo (${balance} ETH). Necessita de refill.`);
    // Aqui você pode implementar a lógica para reabastecer a conta, por exemplo,
    // enviando ETH de uma conta "faucet" ou realizando minting na rede privada.
  }
}

// Função para enviar uma transação, após verificar o saldo disponível
async function sendTransaction() {
  try {
    const balance = await checkBalance(fromAccount);
    const txValue = parseFloat(txValueEth);
    const gasCostEth = 21000 * 1e-9; // Aproximadamente 0.000021 ETH
    const requiredBalance = txValue + gasCostEth;

    if (balance < requiredBalance) {
      console.warn(`❌ Conta ${fromAccount} possui saldo insuficiente: ${balance} ETH (necessário: ${requiredBalance} ETH)`);
      await refillAccountIfNeeded(fromAccount);
      return;
    }

    // Desbloqueia a conta por 600 segundos (10 minutos)
    await web3.eth.personal.unlockAccount(fromAccount, '12345', 600);

    const tx = {
      from: fromAccount,
      to: toAccount,
      value: web3.utils.toWei(txValueEth, 'ether'),
      gas: gasLimit,
      gasPrice: web3.utils.toWei(gasPriceGwei, 'gwei')
    };

    const receipt = await web3.eth.sendTransaction(tx);
    console.log('✅ Transação enviada:', receipt);
  } catch (error) {
    console.error('❌ Erro ao enviar transação:', error.message);
  }
}

// Função para enviar transações de forma periódica (a cada 15 segundos)
function repeatTransactions() {
  setInterval(() => {
    sendTransaction();
  }, 15000);
}

// Inicia a rotina de transações
repeatTransactions();

// Monitoramento do saldo da conta de envio a cada 2 minutos
setInterval(async () => {
  const balance = await checkBalance(fromAccount);
  console.log(`[Monitor] Saldo da conta ${fromAccount}: ${balance} ETH`);
}, 120000);
