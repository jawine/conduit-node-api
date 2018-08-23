const mongoose = require('mongoose'),
    Article = mongoose.model('Article'),
    router = require('express').Router()


// endpoint to retrieve tags from all articles
// GET /api/tags
router.get('/', function(req, res, next) {
    // use mongo find().distinct() to search all Article documents in the collection,
    // and return an array containing all unique tags from each Article's tagList
    Article.find().distinct('tagList')
        .then(function(tagsArr) {
            return res.json({ tags: tagsArr })
        }).catch(next)
})



module.exports = router