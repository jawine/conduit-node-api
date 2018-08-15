const router = require('express').Router();

// register /users router
router.use('/users', require('./users'))
// register /user router
router.use('/user', require('./user'))
// register /profiles router
router.use('/profiles', require('./profiles'))
// register /articles router
router.use('/articles', require('./articles'))

// error handler for validation errors from mongoose, return 422
router.use(function(err, req, res, next) {
    if(err.name === 'ValidationError') {
        return res.status(422).json({
            // iterate over keys in err.errors and add the error messages to an errors array
            errors: Object.keys(err.errors).reduce(function(errors, key) {
                errors[key] = err.errors[key].message

                return errors
            }, {})
        })
    }

    return next(err)
})


module.exports = router;
