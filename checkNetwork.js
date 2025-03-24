const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

async function checkNetwork() {
  try {
    // Verificar bloco genesis
    const genesis = await web3.eth.getBlock(0);
    console.log('Genesis Block Gas Limit:', genesis.gasLimit);
    
    // Verificar bloco atual
    const latest = await web3.eth.getBlock('latest');
    console.log('Latest Block:', latest.number);
    console.log('Latest Block Gas Limit:', latest.gasLimit);
    
    // Verificar contas
    const accounts = await web3.eth.getAccounts();
    console.log('Contas disponíveis:', accounts);
    
    // Verificar saldo da masterAccount definida no genesis
    const masterBalance = await web3.eth.getBalance('0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061');
    console.log('Saldo da master account:', web3.utils.fromWei(masterBalance, 'ether'), 'ETH');
    
    // Verificar saldo da primeira conta
    if (accounts.length > 0) {
      const balance = await web3.eth.getBalance(accounts[0]);
      console.log(`Saldo da primeira conta (${accounts[0]}):`, web3.utils.fromWei(balance, 'ether'), 'ETH');
    }
  } catch (error) {
    console.error('Erro ao verificar a rede:', error.message);
  }
}

checkNetwork();