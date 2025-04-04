const { check } = require('express-validator');

// Product validation rules
exports.productValidation = [
    check('name', 'Product name is required')
        .not().isEmpty().trim(),
    
    check('description', 'Product description is required')
        .not().isEmpty().trim(),
    
    check('price', 'Price must be a positive number')
        .isNumeric()
        .custom((value) => value >= 0),
    
    check('category', 'Category is required')
        .not().isEmpty()
        .isIn(['appetizer', 'main course', 'dessert', 'beverage', 'snack']),
    
    check('preparationTime', 'Preparation time must be a positive number')
        .optional()
        .isNumeric()
        .custom((value) => value >= 0),
    
    check('servingSize', 'Serving size must be a string')
        .optional()
        .isString(),
    
    check('isAvailable', 'Availability status must be boolean')
        .optional()
        .isBoolean(),
    
    check('isVegetarian', 'Vegetarian status must be boolean')
        .optional()
        .isBoolean(),
    
    check('isVegan', 'Vegan status must be boolean')
        .optional()
        .isBoolean(),
    
    check('isGlutenFree', 'Gluten-free status must be boolean')
        .optional()
        .isBoolean(),
    
    check('tags', 'Tags must be an array')
        .optional()
        .isArray(),
    
    check('ingredients', 'Ingredients must be an array')
        .optional()
        .isArray(),
    
    check('allergens', 'Allergens must be an array')
        .optional()
        .isArray()
];