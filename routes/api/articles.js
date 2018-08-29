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

// endpoint to list all articles for a list/feed, optionally filtered by query params
// GET /api/articles
router.get('/', auth.optional, function(req, res, next) {

    // query - empty object that will have properties added based on optional query params 
    // limit - max number of articles returned - default 20
    // offset - number of articles to skip in a query - used by frontend for pagination - default 0
    let query = {}
    let limit = 20
    let offset = 0

    // check if limit and offset values are specified in query string, defaults will be used if not
    if (req.query.limit !== 'undefined') {
        limit = req.query.limit
    }

    if (req.query.offset !== 'undefined') {
        offset = req.query.offset
    }

    // if ?tag query param is provided, 
    // update the query object with a new property to find any articles with the provided tag in their tagList
    if (req.query.tag !== 'undefined') {
        query.tagList = { '$in': [req.query.tag] }        
    }

    // use Promise.all([]) to lookup the author user and favorited user if provided in the query params, then update the query object
    Promise.all([
        req.query.author ? User.findOne({ username: req.query.author }) : null,
        req.query.favorited ? User.findOne({ username: req.query.favorited }) : null
    ]).then(function(results) {
        let author = results[0]
        let favoriter = results[1]

        if(author) {
            query.author = author._id
        }

        if(favoriter) {
            query._id = { $in: favoriter.favorites }
            // if req.query.favorited was provided but user could not be found, return empty list
        } else if(req.query.favorited) {
            query._id = { $in: [] }
        }

        // use Promise.all to ensure the query is executed, the total article count is retrieved, 
        // and the user object (if auth payload was provided) is retrieved,
        // then return the response with the desired query
        return Promise.all([
            // search the Article collection with the specified limit and offset
            // sort descending by created date
            // populate references to author user
            Article.find(query)
                .limit(Number(limit))
                .skip(Number(offset))
                .sort({ createdAt: 'desc' })
                .populate('author')
                .exec(),

            // get count of all documents in Article collection matching query for frontend pagination
            // don't consider limit or offset values
            Article.count(query).exec(),

            // is there an option for finding the query and the count in fewer operations? executing query twice is expensive

            // if request was sent by authenticated user, store reference to their user object, otherwise set to null
            req.payload ? User.findById(req.payload.id) : null
        ]).then(function(results) {
            // results array from Promise.all()
            // results[0] will be an array of the retrieved articles
            let articles = results[0]
            // results[1] will be the count of the queried articles
            let articlesCount = results[1]
            // results[2] will be the user if available, otherwise null
            let user = results[2]

            return res.json({
                
                // return array containing JSON of all articles
                articles: articles.map((article) => {
                    return article.toJSONFor(user)
                }),
                
                articlesCount: articlesCount
            })
        })
    }).catch(next)
})

// feed endpoint, list all articles by authors the user is following
// GET /api/articles/feed
router.get('/feed', auth.required, function(req, res, next) {
    
    let limit = 20
    let offset = 0

    if(typeof req.query.limit !== 'undefined') {
        limit = req.query.limit
    }

    if(typeof req.query.offset !== 'undefined') {
        offset = req.query.offset
    }

    User.findById(req.payload.id).then(function(user) {
        if(!user) { return res.sendStatus(401) }

        Promise.all([
            Article.find({ author: { $in: user.following } })
                .limit(Number(limit))
                .skip(Number(offset))
                .populate('author')
                .exec(),
            Article.count({ author: { $in: user.following } })
        ]).then(function(results) {
            let articles = results[0]
            let articlesCount = results[1]

            return res.json({
                articles: articles.map(function(article) {
                    return article.toJSONFor(user)
                }),
                articlesCount: articlesCount
            })
        }).catch(next)
    })
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