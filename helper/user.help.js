const bcrypt = require('bcrypt');
const config = require('./../config/index');

module.exports = (req, user) => {
    if (req.firstName)
        user.firstName = req.firstName;
    if (req.secondName)
        user.secondName = req.secondName;
    if (req.username)
        user.username = req.username;
    if (req.password)
        user.password = bcrypt.hashSync(req.password, config.saltRounds);
    if (req.email)
        user.email = req.email;
    if (req.phoneNumber)
        user.phoneNumber = req.phoneNumber;
    if (req.dob)
        user.dob = req.dob;
    if (req.gender)
        user.gender = req.gender;
    if (req.role)
        user.role = req.role;
    if (req.roomAddress)
        user.roomAddress = req.roomAddress;
    return user;
}