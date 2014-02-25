var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    name: String,
    login: { type: String, unique: true },  //Ensure logins are unique.
    role: String
});
