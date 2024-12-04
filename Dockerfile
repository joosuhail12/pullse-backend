FROM node:18.15.0-slim

LABEL maintainer="Pullse AI"
LABEL version="18.1.4"
LABEL description="Docker file for Pullse AI Ticket Service."

RUN mkdir -p /usr/src/
WORKDIR /usr/src/
COPY . /usr/src/

RUN npm install .

EXPOSE 8000

CMD ["node", "server.js"]
