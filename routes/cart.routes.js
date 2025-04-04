const router = require('express').Router();

const productModel = require('../models/product.model');
const userModel = require('./../models/user.model');

router.route('/')
    .get(async(req, res, next) => {
        let carts = [];
        req.loggedInUser.cart.forEach((cart) => {
            let p = productModel.find({ _id: cart });
            carts.push(p);
        })
        const data = await Promise.all(carts);
        res.json(data);
    })

router.route('/:id')
    /* Add to cart */
    .post((req, res, next) => {
        userModel.findById(req.loggedInUser._id)
            .exec((err, user) => {
                if (err)
                    return next(err);
                let check = user.cart.find(element => element == req.params.id);
                if (check == req.params.id)
                    return next('This room is already added to your cart');
                user.cart.push(req.params.id);
                user.save((err, saved) => {
                    if (err)
                        return next(err)
                    res.json(saved);
                })
            })
    })
    .put((req, res, next) => {
        userModel.findById(req.loggedInUser._id)
            .exec((err, user) => {
                if (err)
                    return next(err);
                for (var i = 0; i < user.cart.length; i++) {
                    if (user.cart[i] == req.params.id)
                        user.cart.splice(i, 1);
                }
                user.save((err, saved) => {
                    if (err)
                        return next(err)
                    res.send(saved);
                });
            })
    })

module.exports = router;