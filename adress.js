const Web3 = require('web3');

const miners = {
  minerador1: new Web3('http://localhost:8545'),
  minerador2: new Web3('http://localhost:8546'),
  minerador3: new Web3('http://localhost:8547'),
  minerador4: new Web3('http://localhost:8548'),
  minerador5: new Web3('http://localhost:8549'),
};

(async () => {
  for (const [nome, web3] of Object.entries(miners)) {
    const accounts = await web3.eth.getAccounts();
    console.log(`${nome}: ${accounts[0]}`);
  }
})();