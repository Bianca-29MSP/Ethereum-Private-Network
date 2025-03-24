const Web3 = require('web3');
const web3 = new Web3('http://localhost:8545');
(async () => {
  const block = await web3.eth.getBlock(3430, true);
  console.log('Transações no bloco:', block.transactions);
})();
