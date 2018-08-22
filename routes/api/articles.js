const router = require('express').Router()
const passport = require('passport')
const mongoose = require('mongoose')
const Article = mongoose.model('Article')
const User = mongoose.model('User')
const Comment = mongoose.model('Comment')
const auth = require('../auth')


// intercept :article parameter, lookup the article document, and save a reference to it
// /api/articles/:article (:slug)
router.param('article', function(req, res, next, slug) {
    Article.findOne({ slug: slug })
        .populate('author')
        .then(function(article) {
            if (!article) { return res.sendStatus(404) }

            req.article = article

            return next()
        }).catch(next)
})

// intercept requests with a :comment param, lookup the comment, and save a reference to it
router.param('comment', function(req, res, next, id) {
    Comment.findById(id)
        .then(function(comment) {
            if(!comment) { return res.sendStatus(404) }

            req.comment = comment

            return next()
        }).catch(next)
})


// endpoint to create an article
// POST /api/articles
router.post('/', auth.required, function(req, res, next) {
    User.findById(req.payload.id)
        .then(function(user) {
            if (!user) { return res.sendStatus(401) }

            let article = new Article(req.body.article)

            article.author = user

            return article.save()
                .then(function() {
                    console.log(article.author)
                    return res.json({ article: article.toJSONFor(user) })
                })
        }).catch(next)
})


// endpoint to retrieve an article by its slug
// GET /api/articles/:slug
router.get('/:article', auth.optional, function(req, res, next) {
    // use Promise.all([]) to ensure both the User retrieval (if req has payload)
    // and the article author retrieval resolve before proceeding to send the response
    Promise.all([
        req.payload ? User.findById(req.payload.id) : null,
        // populate() is similar to join in relational DB, use to retrieve data from
        // a referenced document (the reference to User with the Article schema)
        // execPopulate() returns a promise for the query
        req.article.populate('author').execPopulate()
    ]).then(function(results) {
        // if req had a payload, this will be the User, if not it will be null
        let user = results[0]

        return res.json({ article: req.article.toJSONFor(user) })
    }).catch(next)   
})

// endpoint to edit the article identified by the given slug
// PUT /api/articles/:slug
router.put('/:article', auth.required, function(req, res, next) {
    // confirm the user id provided in the jwt payload from the client exists,
    // and that it matches the user id of the article's author
    User.findById(req.payload.id)
        .then(function(user) {
            if(req.article.author._id.toString() === req.payload.id.toString()) {
                // ensure the provided fields contain data, 
                // to avoid overwriting existing fields with 'undefined'
                if (typeof req.body.article.title !== 'undefined') {
                    req.article.title = req.body.article.title
                }

                if (typeof req.body.article.description !== 'undefined') {
                    req.article.description = req.body.article.description
                }

                if (typeof req.body.article.body !== 'undefined') {
                    req.article.body = req.body.article.body
                }

                req.article.save()
                    .then(function(article) {
                        return res.json({ article: article.toJSONFor(user) })
                    }).catch(next)
            } else {
                // user id in client token does not match user id of article author
                // 403 forbidden
                return res.sendStatus(403)
            }
        })
})

// endpoint to delete an article
// DELETE /api/articles/:slug
router.delete('/:article', auth.required, function(req, res, next) {
    // confirm the user id from the client token matches the author user id
    User.findById(req.payload.id)
        .then(function() {
            if (req.article.author._id.toString() === req.payload.id.toString()) {
                return req.article.remove()
                    .then(function() {
                        return res.sendStatus(204)
                    })
            } else {
                // forbidden
                return res.sendStatus(403)
            }
        })
})

// endpoint to favorite an article
// POST /api/articles/:slug/favorite
router.post('/:article/favorite', auth.required, function(req, res, next) {
    let articleId = req.article._id

    User.findById(req.payload.id)
        .then(function(user) {
            if (!user) { return res.sendStatus(401) }

            // push the id of the favorited article onto the user's favorites array
            return user.favorite(articleId)
                .then(function() {
                    // then, query all user documents and search their favorites array for the _id of the article,
                    // update the favorite count of the article with the updated count when done
                    return req.article.updateFavoriteCount()
                        .then(function(article) {
                            // return the article JSON
                            return res.json({ article: article.toJSONFor(user) })
                        })
                })
        }).catch(next)
})

// endpoint to unfavorite an article
// DELETE /api/articles/:slug/favorite
router.delete('/:article/favorite', auth.required, function(req, res, next) {
    let articleId = req.article._id

    User.findById(req.payload.id)
        .then(function(user) {
            if (!user) { return res.sendStatus(401) }

            return user.unfavorite(articleId)
                .then(function() {
                    return req.article.updateFavoriteCount()
                        .then(function(article) {
                            return res.json({ article: article.toJSONFor(user) })
                        })
                })
        }).catch(next)
})

// endpoint to create a comment on an article
// POST /api/articles/:slug/comments
router.post('/:article/comments', auth.required, function(req, res, next) {
    
    User.findById(req.payload.id)
        .then(function(user) {
            if (!user) { return res.sendStatus(401) }

            let comment = new Comment(req.body.comment)
            comment.author = user
            comment.article = req.article._id

            // make sure the comment is saved,
            // that the article comments array is updated,
            // and the article is saved,
            // then return the comment JSON
            return comment.save()
                .then(function() {
                    // ArticleSchema.methods.addComment saves the article model after pushing the comment onto the comments array
                    req.article.addComment(comment)
                })
                .then(function(user) {
                    return res.json({ comment: comment.toJSONFor(comment.author) })
                })         
        }).catch(next)
})

// endpoint to list comments on an article
// GET /api/articles/:slug/comments
router.get('/:article/comments', auth.optional, function(req, res, next) {

    Promise.resolve(req.payload ? User.findById(req.payload.id) : null)
        .then(function(user) {
            return req.article.populate({
                path: 'comments',
                populate: {
                    path: 'author'
                },
                options: {
                    sort: {
                        createdAt: 'desc'
                    }
                }
            })
        .execPopulate()
        .then(function(article) {
            return res.json({
                comments: req.article.comments.map(function(comment) {
                    return comment.toJSONFor(user)
                })
            })
        })
    }).catch(next)
})

// endpoint to delete a comment on an article
// DELETE /api/articles/:article/comments/:comment
router.delete('/:article/comments/:comment', auth.required, function(req, res, next) {
    // confirm the client's token id matches the id of the comment author (only author of comment can delete own comment)
    if(req.comment.author.toString() === req.payload.id.toString()) {
        // Article.methods.removeComment removes the comment from the comments array then saves the article
        req.article.removeComment(req.comment._id)
            // find the comment by its ID and remove it
            .then(Comment.find({ _id: req.comment._id }).remove().exec())
            .then(function() {
                // difference between return res.sendStatus() and res.sendStatus() ??
                return res.sendStatus(204)
            })
    } else {
        // forbidden
        return res.sendStatus(403)
    }
})


module.exports = router