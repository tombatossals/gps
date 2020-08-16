var Mikronode = require('mikronode/lib/index.js');

var connection = Mikronode.getConnection('10.228.171.33', 'guest', '', { closeOnDone: true, closeOnTimeout: true, tls: { rejectUnauthorized: false } });
console.log(connection);
