const router = require('express').Router()
const mongoose = require('mongoose')
const User = mongoose.model('User')
const auth = require('../auth')


// check for the :username param in the route
// prepopulate req.profile with user data if it is present
// catch any errors and send them to the error-handling middleware
router.param('username', function(req, res, next, username) {
    User.findOne({ username: username })
        .then(function(user) {
            if(!user) { return res.sendStatus(404) }

            req.profile = user

            return next()
        }).catch(next)
})

// endpoint for fetching a user's profile by username
// GET /api/profiles/:username
router.get('/:username', auth.optional, function(req, res, next) {
    // if request is sent with a token payload (from an authenticated user),
    // find user requesting the profile and check if they are following the viewed user
    if(req.payload) {
        User.findById(req.payload.id)
            .then(function(user) {
                // if user not found in payload, return profile JSON called with false
                if(!user) { return res.json({ profile: req.profile.toProfileJSONFor(false) })}

                // otherwise, return profile JSON called with the user
                return res.json({ profile: req.profile.toProfileJSONFor(user) })
            })
    } else {
        // if request is not sent with token payload, return the profile JSON called with false
        return res.json({ profile: req.profile.toProfileJSONFor(false) })
    }
})

// endpoint for following a user
// POST /api/profiles/:username/follow
router.post('/:username/follow', auth.required, function(req, res, next) {

    User.findById(req.payload.id)
        .then(function(user) {
            if(!user) { return res.sendStatus(401) }

            return user.follow(req.profile._id)
                .then(function(user) {
                    return res.json({ profile: req.profile.toProfileJSONFor(user) })
                })
        }).catch(next)
})


// endpoint for unfollowing a user
// DELETE /api/profiles/:username/follow
router.delete('/:username/follow', auth.required, function(req, res, next) {

    // authenticate requesting user
    // call unfollow() method on unfollowed user ID
    // return profile JSON
    User.findById(req.payload.id)
        .then(function(user) {
            if(!user) { return res.sendStatus(401) }

            return user.unfollow(req.profile._id)
                .then(function(user) {
                    return res.json({ profile: req.profile.toProfileJSONFor(user) })
                })
        }).catch(next)
})


module.exports = router