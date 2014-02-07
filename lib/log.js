var winston = require('winston');

require("winston-mongodb").MongoDB;

var options = { db: "troncales", level: "debug" };

var logger = new (winston.Logger)({
  transports: [
    //new (winston.transports.Console)({ json: false, timestamp: true }),
    new winston.transports.File({ filename: __dirname + '/../log/debug.log', level: "debug", json: false, timestamp: true })
  ],
  //exceptionHandlers: [
    //new (winston.transports.Console)({ json: false, timestamp: true }),
  //  new winston.transports.File({ filename: __dirname + '/../log/exceptions.log', json: false })
  //],
  //exitOnError: false
});

logger.add(winston.transports.MongoDB, options);

module.exports = logger;
