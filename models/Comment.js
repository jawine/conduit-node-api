const mongoose = require('mongoose')

const CommentSchema = new mongoose.Schema({

    body: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article'}

}, { timestamps: true })

// return JSON representation of a comment
// needs a user argument to retrieve the author profile information
CommentSchema.methods.toJSONFor = function(user) {
    return {
        id: this._id,
        body: this.body,
        createdAt: this.createdAt,
        author: this.author.toProfileJSONFor(user)
    }
}



mongoose.model('Comment', CommentSchema)