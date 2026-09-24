# No dependencies: the worker uses only Node's built-in fetch.
FROM node:20-alpine
WORKDIR /app
COPY worker.mjs ./worker.mjs
USER node
CMD ["node", "/app/worker.mjs"]
