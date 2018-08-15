const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const mongoose = require('mongoose')
const User = mongoose.model('User')

// LocalStrategy([optional POST properties], <verify callback>)
// optional props are passed into verify callbacK: verify(<username>, <password>, <done callback>)
// if credentials are valid, verify() invokes done() to supply the authenticated user: done(null, user)
// if credentials are invalid, verify() invokes done() with 'false' to indicate an auth failure: done(null, false)
// in case of server error (ie DB unavailable), not auth failure, invoke done() with error: done(err)
passport.use(new LocalStrategy({
    usernameField: 'user[email]',
    passwordField: 'user[password]'
}, function(email, password, done) {
    User.findOne({ email: email })
        .then(function(user) {
            // if user nonexistent or has invalid password
            if(!user || !user.validPassword(password)) {
                // call done() with false - auth error
                return done(null, false, { errors: { 'email or password': 'is invalid'}})
            }

            // auth success
            return done(null, user)
        }).catch(done)
}))