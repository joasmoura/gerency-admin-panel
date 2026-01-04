# Estágio de construção: instala dependências e faz o build da aplicação
FROM node:22-alpine AS builder

# Define o diretório de trabalho no contêiner
WORKDIR /app

# Copia os arquivos package.json e package-lock.json e instala as dependências
COPY package*.json ./
RUN npm ci

# Copia o restante do código
COPY . .

# Faz o build da aplicação para produção
RUN npm run build


# Estágio de produção: imagem final para rodar a aplicação
FROM node:22-alpine AS runner

# Define o diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos necessários da etapa de build
COPY --from=builder /app/.output .

ENV NODE_ENV=production
# ARG NODE_PORT=3000

# ENV NODE_PORT=$NODE_PORT
# # Expõe a porta em que o Nuxt rodará (padrão é 3000)
# EXPOSE $NODE_PORT

# Comando para iniciar o servidor Nuxt em produção
CMD [ "node", "/app/server/index.mjs" ]