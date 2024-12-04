Pullse AI NodeJS Base Framework


node .\seeder\role-seeder.js
node .\seeder\user-seeder.js

node .\server.js


setup:
docker run -d -p 5672:5672 -p 15672:15672 --name rabbitmq rabbitmq