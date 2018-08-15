const mongoose = require('mongoose')
const router = require('express').Router()
const passport = require('passport')
const User = mongoose.model('User')
const auth = require('../auth')


// endpoint to get current user auth payload from token
// /api/user
router.get('/', auth.required, function(req, res, next) {
    // find a user by provided ID
    // if User.findById() promise is not reject but the user retrieved is falsey, 
    // jwt payload is invalid - respond with 401
    User.findById(req.payload.id)
        .then(function(user) {
            if (!user) { return res.sendStatus(401) }

            return res.json({ user: user.toAuthJSON() })
        }).catch(next)
})

// endpoint to update user profile
// /api/user
router.put('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id)
        .then(function(user) {
            if(!user) { return res.sendStatus(401) }

            // only update fields explicitly passed
            if(typeof req.body.user.username !== 'undefined') {
                user.username = req.body.user.username
            }

            if(typeof req.body.user.email !== 'undefined') {
                user.email = req.body.user.email
            }

            if(typeof req.body.user.bio !== 'undefined') {
                user.bio = req.body.user.bio
            }

            if(typeof req.body.user.image !== 'undefined') {
                user.image = req.body.user.image
            }

            if(typeof req.body.user.password !== 'undefined') {
                // setPassword() method of User model, generates new salt and hash and stores for user
                user.setPassword(req.body.user.password)
            }
        
            return user.save()
                .then(function() {
                    return res.json({ user: user.toAuthJSON() })
                })
        }).catch(next)
})


module.exports = router