const Web3 = require('web3');

// Inicializa o Web3 para o minerador 1 (supondo que o endpoint esteja em localhost:8545)
const web3Miner1 = new Web3('http://localhost:8545');

// Define a conta master (a mesma que você usa no seu ambiente)
const masterAccount = '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061';

// Consulta e imprime o saldo da conta master
web3Miner1.eth.getBalance(masterAccount)
  .then(balance => {
    console.log("Saldo da conta master:", web3Miner1.utils.fromWei(balance, 'ether'), "ETH");
  })
  .catch(error => {
    console.error("Erro ao obter o saldo:", error);
  });
