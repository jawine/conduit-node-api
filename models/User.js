const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const secret = require('../config').secret


const UserSchema = new mongoose.Schema({
    username: {
        // add validations to prevent dirty data
        type: String,
        lowercase: true,
        // ensure uniqueness using uniqueValidator plugin
        unique: true,
        // [required parameter, error message to show if param not present] 
        required: [true, "can't be blank"],
        // [regex to match, error msg if regex doesn't match]
        // could modify regex to validate min and max username length if desired
        // /^[a-zA-Z0-9]{min, max}$/
        match: [/^[a-zA-Z0-9]+$/, "is invalid"],
        // set up an index to optimize queries
        index: true
    },
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: [true, "can't be blank"],
        match: [/\S+@\S+\.\S+/, "is invalid"],
        index: true
    },
    bio: String,
    image: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
    // array of IDs of followed users
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    hash: String,
    salt: String
    // include createdAt and updatedAt field on model with timestamps: true
}, { timestamps: true })


// register uniqueValidator plugin
UserSchema.plugin(uniqueValidator, {message: 'is already taken'})

// create password setting method
UserSchema.methods.setPassword = function(password) {
    // create 16 byte hex salt value aka. a nonce9
    this.salt = crypto.randomBytes(16).toString('hex')
    // create hash from password-based key-derivation function PBKDF,
    // pass in password, generated salt, iterations, keylength, digest algorithm
    // NOTE: using synchronous version of pbkdf2
    this.hash = crypto.pbkdf2Sync(password, this.salt, 40000, 512, 'sha512').toString('hex')
}

// create password validation method
// run pbkdf2 with same number of iterations and keyLength of setPassword function, user's salt, user's password
UserSchema.methods.validPassword = function(password) {
    let hash = crypto.pbkdf2Sync(password, this.salt, 40000, 512, 'sha512').toString('hex')
    return this.hash === hash
}

// generate a JWT for a user
// includes user id, username, exp (UNIX timestamp determining when token expires)
UserSchema.methods.generateJWT = function() {
    
    let today = new Date()
    let exp = new Date(today)
    // set expiration for 60 days from now
    exp.setDate(today.getDate() + 60)

    // return jwt signed with id, username, expiration, and server secret
    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000),
    }, secret)
}

// get json representation of user for authentication purposes
UserSchema.methods.toAuthJSON = function() {
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    }
}

// return json representation of public user data (no private data returned)
// param - when supplied with a user object (i.e. when profile is requested by an authenticated user),
// check if that user is following the queried user
// toProfileJSONFor will be called with false if auth payload not supplied
UserSchema.methods.toProfileJSONFor = function(followerUser) {
    return {
        username: this.username,
        bio: this.bio,
        // if user is viewing own profile (through GET /api/user and doesn't have image set, returns null,
        // however if user is viewing another profile without image set, return default placeholder 
        image: this.image || 'https://static.productionready.io/images/smiley-cyrus.jpg',
        // check if provided user object is following the queried user
        following: followerUser ? followerUser.isFollowing(this._id) : false
    }
}

// allow a user to favorite an article
UserSchema.methods.favorite = function(id) {
    if(this.favorites.indexOf(id) === -1) {
        this.favorites.push(id)
    }

    return this.save()
}

// unfavorite an article
UserSchema.methods.unfavorite = function(id) {
    if(this.favorites.indexOf(id) !== -1) {
        this.favorites.remove(id)
    }
    
    return this.save()
}

// check whether a user has favorited an article - bool
UserSchema.methods.isFavorite = function(id) {
    return this.favorites.some(function(favoriteId) {
        return favoriteId.toString() === id.toString()
    })
}

// follow another user
UserSchema.methods.follow = function(userID) {
    if(this.following.indexOf(userID) === -1) {
        this.following.push(userID)
    }

    return this.save()
}

// unfollow another user
UserSchema.methods.unfollow = function(userID) {
    this.following.remove(userID)

    return this.save()
}

// check if following another user - bool
UserSchema.methods.isFollowing = function(userID) {
    if(this.following.indexOf(userID) !== -1) {
        return true
    }

    return false
}

// register schema with mongoose
// model can be accessed anywhere in application with mongoose.model('User')
mongoose.model('User', UserSchema)