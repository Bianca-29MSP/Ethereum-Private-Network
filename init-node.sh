#!/bin/sh
set -e

# Diretório de dados Ethereum
DATA_DIR=/root/.ethereum

# Inicializar com genesis apenas se a blockchain ainda não existir
if [ ! -d "$DATA_DIR/geth/chaindata" ]; then
  echo "Inicializando nó com genesis.json pela primeira vez..."
  geth --datadir=$DATA_DIR init /ethereum/genesis.json
else
  echo "Dados blockchain existentes encontrados, mantendo estado..."
fi

# Criar conta se não existir ainda
if [ ! -f "$DATA_DIR/keystore"/* ]; then
  echo "Criando nova conta..."
  echo "$ACCOUNT_PASSWORD" > $DATA_DIR/password.txt
  geth --datadir=$DATA_DIR account new --password $DATA_DIR/password.txt
fi

# Executar geth com os parâmetros recebidos
echo "Iniciando geth com os parâmetros: $@"
exec geth --datadir=$DATA_DIR "$@"