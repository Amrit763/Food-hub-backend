const { check, validationResult } = require('express-validator');

// Validate condiment object
const condimentValidation = [
  check('condiments.*.name', 'Condiment name is required').notEmpty().trim(),
  check('condiments.*.price', 'Condiment price must be a positive number').isFloat({ min: 0 }),
  check('condiments.*.isDefault', 'isDefault must be a boolean value').optional().isBoolean()
];

// Product creation validation
exports.createProductValidation = [
  check('name', 'Product name is required').notEmpty().trim(),
  check('description', 'Product description is required').notEmpty().trim(),
  check('price', 'Price must be a positive number').isFloat({ min: 0 }),
  check('category', 'Invalid category').isIn([
    'appetizer', 'main course', 'dessert', 'beverage', 'snack'
  ]),
  check('tags', 'Tags must be an array of strings').optional().isArray(),
  check('ingredients', 'Ingredients must be an array of strings').optional().isArray(),
  check('allergens', 'Allergens must be an array of strings').optional().isArray(),
  check('condiments', 'Condiments must be an array').optional().isArray(),
  ...condimentValidation,
  check('preparationTime', 'Preparation time must be a number').optional().isInt({ min: 0 }),
  check('servingSize', 'Serving size must be a string').optional().isString(),
  check('isAvailable', 'isAvailable must be a boolean').optional().isBoolean(),
  check('isVegetarian', 'isVegetarian must be a boolean').optional().isBoolean(),
  check('isVegan', 'isVegan must be a boolean').optional().isBoolean(),
  check('isGlutenFree', 'isGlutenFree must be a boolean').optional().isBoolean()
];

// Product update validation
exports.updateProductValidation = [
  check('name', 'Product name must be a string').optional().notEmpty().trim(),
  check('description', 'Product description must be a string').optional().notEmpty().trim(),
  check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
  check('category', 'Invalid category').optional().isIn([
    'appetizer', 'main course', 'dessert', 'beverage', 'snack'
  ]),
  check('tags', 'Tags must be an array of strings').optional().isArray(),
  check('ingredients', 'Ingredients must be an array of strings').optional().isArray(),
  check('allergens', 'Allergens must be an array of strings').optional().isArray(),
  check('condiments', 'Condiments must be an array').optional().isArray(),
  ...condimentValidation,
  check('preparationTime', 'Preparation time must be a number').optional().isInt({ min: 0 }),
  check('servingSize', 'Serving size must be a string').optional().isString(),
  check('isAvailable', 'isAvailable must be a boolean').optional().isBoolean(),
  check('isVegetarian', 'isVegetarian must be a boolean').optional().isBoolean(),
  check('isVegan', 'isVegan must be a boolean').optional().isBoolean(),
  check('isGlutenFree', 'isGlutenFree must be a boolean').optional().isBoolean()
];

// Condiments update validation
exports.updateCondimentsValidation = [
  check('condiments', 'Condiments must be an array').isArray(),
  ...condimentValidation
];

// Validate request
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  next();
};