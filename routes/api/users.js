const mongoose = require('mongoose')
const router = require('express').Router()
const passport = require('passport')
const User = mongoose.model('User')
const auth = require('../auth')

// user registration
// /api/users
router.post('/', function(req, res, next) {
    // instantiate new User object and set its properties based on request params
    let user = new User()

    user.username = req.body.user.username
    user.email = req.body.user.email
    user.setPassword(req.body.user.password)

    // persist the user object to DB, then return a user object
    user.save()
        .then(function() {
            return res.json({ user: user.toAuthJSON() })
        }).catch(next)
        // if promise resolved, user is saved to DB
        // if promise rejected, error passed to error handler middleware
        // will this handle server errors???
})

// user login
// /api/users/login
router.post('/login', function(req, res, next) {
    // confirm email and password are provided, return 422 if not
    if(!req.body.user.email) {
        return res.status(422).json({ errors: { email: "can't be blank"}})
    }
    
    if(!req.body.user.password) {
        return res.status(422).json({ errors: { email: "can't be blank"}})
    }

    // perform passport auth, disable session-based auth
    // the callback here is used as the done function in the LocalStrategy in config/passport.js
    // call authenticate() from within the express route handler to ensure it has access to the req and res objects
    passport.authenticate('local', { session: false }, function(err, user, info) {
        // pass errors to error handler middleware
        if(err) { return next(err) }

        // if auth successful, assign their token value to a generated jwt
        // then return user object
        if(user) {
            user.token = user.generateJWT()
            return res.json({ user: user.toAuthJSON() })
        } else {
            return res.status(422).json(info)
        }
    })(req, res, next)
})


module.exports = router