const Web3 = require('web3');

// Configurações
const minerName = 'miner2';
const minerUrl = 'http://localhost:8546';
const masterAccount = '0xa772f976e4E4D53D738fAE5493385a41d1DC8599'; // Conta com fundos
const refillAmount = '20';  // 20 ETH para cada conta
const minBalance = 19;     // Reabastecer se tiver menos que 19 ETH

// Contas gerenciadas por este minerador
// Observação: Miner2 só tem a master account com saldo, as demais contas têm saldo zero
const accountsMiner2 = [
  '0x36f5fBA0718d83FCfa31e76EC4C4dAA55798E061',
  '0xa772f976e4E4D53D738fAE5493385a41d1DC8599',
  '0xc5803Ca9b9Ff136855C287b1515D5565139926d3',
  '0x9DA6D31B1b600e0e3c66f1D063F3464eeF8f2a82',
  '0x06fd657C34e3213d3a8de5dfb4033b369F2Bd0Fb',
  '0xc208f525ab185d9f95b882ee6ecf20849c64bBa0',
  '0x024c2784F51b759fA8B20D240Fbc6E01b8fE39f2',
  '0x5554833AE09e9FE0a50fD4F9553aBA69b36C9ff9',
  '0xEa5759be2997Da54ab8e09D63335992e5676bf3C',
  '0xb706b1aAc229a2D2A22E1C88c0C6e43e7FaB959d',
  '0xf3A165160240f5962d78ba576a659197652b5ab6',
  '0x6D80F95030Da53Bed0Db38cc7098327D8b887818',
  '0xF3c50B2958c78c7200D05B987de56DAd765b4E55',
  '0xAf0040d514657b6F99100b5ABfA9583FB910Eef3',
  '0x6748d62C4E852df2F863a9Bc684843265cF5a7fc',
  '0x9a861989dD151F75231E4225f8Ff45b06e274758',
  '0x45abCd7eBa0e9F54f03aD5d482C97eC92b9C0159',
  '0xB0E1A93dF0db5A7962AAd879FF2340592c4768F8',
  '0x03c7EB34F543e9e46DfA03AB89Ec44d36D4a9616',
  '0xaaC469C91E2Ee835FAad025Bd50eC63b69C848f3',
  '0x432D4abe9dbb25ce8392898C95BeC46322931aBF',
  '0xC9c123BAf7fcbC09Bf658aF5B461fA6Db02d222F',
  '0x904092E7665Dd785069e15E984d083568E1C92B1',
  '0xa907F485aD3F1c6d8661c3B6E84eCE825E3534De',
  '0x10570c206a45F31Ffab4BBd5525293E5D99aB32C',
  '0x93CA1c81c5B8d8Ec81be1723F3983e601Ba7B284',
  '0x46179991e76115f20b72271CDc82ceC4e119bcA1',
  '0xc15Bc736366f47300f3AE1670Ee42285f1f1f299',
  '0x6615977e927163C6E51eF731CB1003289223b31D',
  '0x74202c5bB1369d15899D669D7efC8f11aC9ccC32',
  '0xdeB97295605685F9a12da0cf29187739F2b36524',
  '0x487b6b5dC90c189Abe5Ad1F379f6238e48f74C3a',
  '0x6a27138b28b9d097eB35Dc49D76A8e40BEC35411',
  '0xbC2a2c355ae1eBF613145Bf5b9052728Bf0E3457',
  '0xFCb07bEce68F44c485da4532a2F33FA604B4124D',
  '0xFEfc4C0322d2d48fd3Cea2C2454edd4bbB7d83c3',
  '0x61Cf81b02BBDbA1Fe3161d02cFBCF9Caf24a4E37',
  '0x3AdDdd9Ef47cFee92fe7A96c868fbcD39ffF5892',
  '0x2C399B1a7823a01633c2fa4324E38db16F613AA8',
  '0x56f064Ae06f8E002a03882AAC89C9923FA68eCB2',
  '0x2a85AFc5A31aD6427A51eC6925DFC8c5AcbFc8d2',
  '0x453fCDD9eFE5c957000df7ee0a81Ed5a1f38853A',
  '0x79f6B91cB2D5D247c7803E2c4588cA0d0e8994A6',
  '0xE9F5ca5A508d62E464F104bC09c53f4cd78205e5',
  '0x85a1f3D6534A1b7dB572d80B01899f0046d70c6B',
  '0xED3De8C9E1612b355031934927F765C22fE20b8b',
  '0x115Cf2E02d37228E07EB734E95ABbE94a76b057F',
  '0x2F47C57722FB81f595E17a1d027767FB9d22a9DE',
  '0x40AE115c5ff46f40fb0023EeE9AF952Acd1bBE28',
  '0x06898B92e2e335067a25f20F9872F9423a626768',
  '0xB3FDA1e27ed309cE1Dc9EBA8eF0439F5E841d2a6',
  '0x5AAF1f7E48C4BeE1Ef2539e41c0d2B3393E3BCC0',
  '0x08Ed23E38908500da317D4595966f7bBE71874d1',
  '0x7E08bbbe632FB2004f7381221b5065B2b6fE95dB',
  '0x6861344D9021E9d53B1F8D691fb8E07191eb7663',
  '0xf26372Ed98365D10F6baf950bCDAf65Ef52CaF4B',
  '0x2d41482ee6BB3403ed82649e07Ed1A6865CD8f1C',
  '0x38888bDEb53B7805bb578236cAF61F003A8299f0',
  '0xA671032315F0c481d4aA61De62148C3a0A9793E7',
  '0x10dF1E47e7E9E06106CbB829cb422Db21CCa3724',
  '0xd203DD8587e778FBd0dED6aab3427379C02Ef766',
  '0x6147F64Df5319475cbc1a0c04B486d236249683c',
  '0xf7eCB1082CAfdB6e83A27402EfC57AdAf48489D1',
  '0x1FF3E66e9E4d9cB8432cf25c2486A3dFdfFD930a',
  '0x54Fe14aA1b45B880837BEaadF1ec351B2BE883aB',
  '0x7fdf9fbfeFA46Db125290Ddc17C328F0EA252B6C',
  '0x1A9716B725B43Ba14768F07F0c924271D8Fc65db',
  '0x7fD2772bB0aFEfCF681DBf7465427eD8094E2b99',
  '0x94B82C1B77293B05d8C59ca45A26E71F22B61f59',
  '0x3602837CE56D400446525d4C99b19854358ae726',
  '0xfE1a3a33F1D21A8a9a56708Cd2d0efdef87095f8',
  '0x30EAa42b0A5581025A02598D927A7Bc1abf2Db06',
  '0x01D23796b0fD335Aa9F1F8C5d0f502d08441c31D',
  '0xe368Cc58f6f61B3bAe8182f2C24ac2d6CA3C3C0B',
  '0x0851bb99fb55D260910BEba956feb0D15c3aD2aE',
  '0xaD6b082D1a391BA2f3FD09D7f1430609e01D2d55',
  '0x172dbE626D202aaF78A9f82FECb98ef21fC05B96',
  '0x55afb8f73B436c0D11a03968b00ebB51d9363070',
  '0x16d76AfDffB9381bBAE08a2d1d0CACEf0e6C09E7',
  '0x4E8D078b0369Ad336f8828df1Be01f0f3A89d1DA',
  '0xA95f29De7e0eCEe66414AE1de91292390b2D594D',
  '0x40e1d99905C6ffDa59160dae44aaE5f857003e0f',
  '0x4dc372E75a6F9A97c0c9420cDA9Ea24fC9B91dff',
  '0xca7684257D3B068BE7ca0B6A81cCD08F74903cA1',
  '0x13F1977498d0334d6f6B3013C108Edec1bDaDD1C',
  '0x57332230c5B48fEf0ED84f8b5F6b8580cB6eDC19',
  '0xf5d9384E5BbCDE722A93B05de18e6FB776438314',
  '0x5788B601185700e0E84396C118Bd6B8C132955c8',
  '0x73B8A1424af1Ca00E64F892FaaD59de3fa8286D0',
  '0x9d1e676a3cf35D7AC110d727BBf7795Dc023a985',
  '0xB4db560C09548f1e4E8F5C9A636d58B5A56fF332',
  '0x96429Bf11ae19be41D1218Ae883A3012e90b5f13',
  '0xeD4fFa474d71BbFe94a74C3B8bd19D1EC83F5fA2',
  '0x7BFb108BF7369b55723a17fe88DB412872Ca1538',
  '0xc23ED07AE66Eb663447EC6BC170fDa59CDD94f56',
  '0x01E64714bbAee7e69De965edDF9f91bB2E3Dd4c6',
  '0xe264c570242575a58b6e56dCb2C31c1FB8dFAA91'
];

// Inicializa o Web3
const web3 = new Web3(minerUrl);

// Função de espera
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Função principal que reabastece todas as contas
async function refillAllAccounts() {
  try {
    console.log(`\n--- ${minerName.toUpperCase()} (${minerUrl}) ---`);
    console.log('🚀 Iniciando reabastecimento de contas com 20 ETH cada...');
    
    // Verifica saldo da master account
    const masterBalance = await web3.eth.getBalance(masterAccount);
    const masterBalanceEth = web3.utils.fromWei(masterBalance, 'ether');
    console.log(`💰 Saldo da conta master: ${masterBalanceEth} ETH`);
    
    // Verifica se a master tem ETH suficiente
    const accountsEstimate = accountsMiner2.length - 1; // Menos a própria master
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
    
    // Usa a lista de contas específicas deste minerador
    console.log(`🔍 ${accountsMiner2.length} contas configuradas para este minerador`);
    
    // Filtra a lista para remover a master account
    const accountsToRefill = accountsMiner2.filter(acc => 
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

// Verifica o estado do nó
async function checkNodeStatus() {
  try {
    console.log(`\n--- VERIFICANDO ESTADO DO NÓ ${minerName.toUpperCase()} ---`);
    
    // Verifica conexão
    const isListening = await web3.eth.net.isListening();
    console.log(`🔌 Nó conectado: ${isListening ? 'Sim' : 'Não'}`);
    
    if (!isListening) {
      console.error('⛔ Nó não está conectado! Impossível continuar.');
      return false;
    }
    
    // Verifica número de peers
    const peerCount = await web3.eth.net.getPeerCount();
    console.log(`👥 Número de peers: ${peerCount}`);
    
    // Verifica número do bloco
    const blockNumber = await web3.eth.getBlockNumber();
    console.log(`🧱 Bloco atual: ${blockNumber}`);
    
    // Verifica preço do gas
    const gasPrice = await web3.eth.getGasPrice();
    console.log(`⛽ Preço do Gas: ${web3.utils.fromWei(gasPrice, 'gwei')} gwei`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Erro ao verificar estado do nó: ${error.message}`);
    return false;
  }
}

// Função principal
async function main() {
  try {
    console.log(`\n=== SCRIPT DO MINERADOR ${minerName.toUpperCase()} ===`);
    
    // Verifica o estado do nó primeiro
    const nodeOk = await checkNodeStatus();
    if (!nodeOk) {
      console.error(`⛔ Problemas no nó ${minerName}. Finalizando script.`);
      return;
    }
    
    // Reabastece as contas
    await refillAllAccounts();
    
    console.log(`\n✨ Script do ${minerName} concluído! Todas as contas têm pelo menos ${minBalance} ETH.`);
    
  } catch (error) {
    console.error(`💥 Falha no script do ${minerName}:`, error.message);
  }
}

// Executa a função principal
main().catch(err => console.error('💥 Erro crítico:', err.message));