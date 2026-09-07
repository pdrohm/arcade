# Arcade da casa — imagem para rodar na VPS atrás do Traefik.
FROM node:22-alpine

WORKDIR /app

# As dependências primeiro: o Docker reaproveita esta camada enquanto o package.json não mudar.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY shared/ ./shared/
COPY public/ ./public/
COPY games/ ./games/

# As salas ficam num volume, para sobreviver a um restart ou a uma imagem nova.
ENV PORT=9393 STATE_FILE=/data/state.json NO_LAN=1
RUN mkdir -p /data
EXPOSE 9393

CMD ["node", "server.js"]
