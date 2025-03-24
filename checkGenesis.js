const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');

async function checkGenesis() {
  try {
    // Buscar o bloco genesis (bloco 0)
    const genesis = await web3.eth.getBlock(0);
    console.log('Genesis Block:', genesis);
    
    // Verificar o saldo inicial da masterAccount no momento da criação
    const state = await web3.eth.getBalance('0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061', 0);
    console.log('Saldo no Genesis:', web3.utils.fromWei(state, 'ether'), 'ETH');
  } catch (error) {
    console.error('Erro ao verificar genesis:', error.message);
  }
}

checkGenesis();