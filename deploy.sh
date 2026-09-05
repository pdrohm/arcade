#!/bin/bash
# Sobe uma versão nova do arcade. Roda NA VPS, dentro de /root/Pedro/arcade.
# Normalmente você não chama este arquivo à mão: use `arcade deploy` do Mac.
#
# Por que não é só `docker-compose up -d --build`: o docker-compose desta máquina é a
# versão 1.29.2, que quebra ao RECRIAR um container no Docker 29 (KeyError ContainerConfig).
# Criar do zero funciona. Então removemos o container antes de subir. O volume das salas fica.
set -e
cd "$(dirname "$0")"
echo "→ construindo…"
docker-compose build
echo "→ trocando o container (o volume arcade_arcade_state é preservado)…"
docker rm -f arcade 2>/dev/null || true
docker ps -a --format "{{.Names}}" | grep -E "_arcade$" | xargs -r docker rm -f
docker-compose up -d
sleep 3
echo "→ logs:"
docker logs --tail 8 arcade
