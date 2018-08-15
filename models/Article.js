const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const slug = require('slug')
const shortid = require('shortid')
const User = mongoose.model('User')

const ArticleSchema = new mongoose.Schema({
    slug: {
        type: String,
        lowercase: true,
        unique: true 
    },
    title: String,
    description: String,
    body: String,
    favoritesCount: {
        type: Number,
        default: 0
    },
    tagList: [{ type: String }],
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }]
}, { timestamps: true })

ArticleSchema.plugin(uniqueValidator, { message: 'is already taken' })

// generate a unique slug for each new article
// update the slug property of the article before attempting to persist to DB
ArticleSchema.methods.slugify = function() {
    // use shortid to generate a unique id and concatenate with the title of the article
    // output for both slug() and shortid() are URL-safe
    this.slug = `${ slug(this.title) + '-' + shortid.generate() }`
}

// ensure the slug is generated before mongoose attempts to validate the model 
// Schema.prototype.pre() hook in this case calls the provided callback before mongoose validates the input
ArticleSchema.pre('validate', function(next) {
    if (!this.slug) { 
        this.slugify()
    }

    next()
})

// return JSON representation of an article
ArticleSchema.methods.toJSONFor = function(user) {
    return {
        slug: this.slug,
        title: this.title,
        description: this.description,
        body: this.body,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        tagList: this.tagList,
        // if user param is provided and has the article in their favorites, true, otherwise false
        favorited: user ? user.isFavorite(this._id) : false,
        favoritesCount: this.favoritesCount,
        author: this.author.toProfileJSONFor(user)
    }
}

// use mongoose query to determine how many users have the article id in their favorites array
ArticleSchema.methods.updateFavoriteCount = function() {
    let article = this

    // Query.prototype.count(<filter>, <callback>) - return number of documents matching the filter
    // favorites: { $in: [value] } - select all documents where value is found in favorites array
    return User.count({ favorites: { $in: [article._id] } })
        .then(function(count) {
            article.favoritesCount = count

            return article.save()
        })
}

// add the comment to the comments array
ArticleSchema.methods.addComment = function(comment) {
    
    if(this.comments.indexOf(comment) === -1) {
        this.comments.push(comment)
    }

    return this.save()
}

// delete the comment from the comments array
ArticleSchema.methods.removeComment = function(comment) {

    if(this.comments.indexOf(comment) !== -1) {
        this.comments.remove(comment)
    }

    return this.save()
}

mongoose.model('Article', ArticleSchema)