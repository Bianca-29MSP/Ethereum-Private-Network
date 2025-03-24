FROM ethereum/client-go:v1.10.1

ARG ACCOUNT_PASSWORD

# Copiar arquivos necessários
COPY genesis.json /ethereum/genesis.json
COPY init-node.sh /ethereum/init-node.sh

# Tornar o script de inicialização executável
RUN chmod +x /ethereum/init-node.sh

# Definir o script de inicialização como ponto de entrada
ENTRYPOINT ["/ethereum/init-node.sh"]
