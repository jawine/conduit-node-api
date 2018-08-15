const jwt = require('express-jwt')
const secret = require('../config').secret


// helper function to return the token from request authorization header
function getTokenFromHeader(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') {
        return req.headers.authorization.split(' ')[1]
    }

    return null
}

const auth = {
    // jwt(<secret>, <requestProperty>, <token>)
    // jwt for endpoints with required auth
    required: jwt({
        secret: secret,
        // define which property the payload will be attached to, userProperty in this case
        userProperty: 'payload',
        getToken: getTokenFromHeader
    }),
    // jwt for endpoints with optional auth
    optional: jwt({
        secret: secret,
        userProperty: 'payload',
        credentialsRequired: false,
        getToken: getTokenFromHeader
    })
}

module.exports = auth