# syntax=docker/dockerfile:1
FROM oven/bun:debian

RUN apt-get update && apt-get install -y \
    wget \
    apt-transport-https \
    software-properties-common \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb


RUN apt-get update && apt-get install -y dotnet-runtime-6.0


WORKDIR /hextech-gunblade

COPY package.json package.json
COPY bun.lock bun.lock

RUN bun install

COPY . .