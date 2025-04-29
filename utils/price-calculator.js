/**
 * Utility functions for calculating prices with condiments
 */

/**
 * Calculate total price for a product with selected condiments
 * 
 * @param {Number} basePrice - The base price of the product
 * @param {Array} selectedCondiments - Array of selected condiment objects with price
 * @param {Number} quantity - The quantity of the product
 * @returns {Number} - The total price
 */
exports.calculateTotalPrice = (basePrice, selectedCondiments = [], quantity = 1) => {
    let total = basePrice;
    
    // Add prices of all selected condiments
    if (selectedCondiments && selectedCondiments.length > 0) {
      for (const condiment of selectedCondiments) {
        total += condiment.price || 0;
      }
    }
    
    // Multiply by quantity
    total *= quantity;
    
    // Round to 2 decimal places
    return Math.round(total * 100) / 100;
  };
  
  /**
   * Calculate the additional price added by condiments
   * 
   * @param {Array} selectedCondiments - Array of selected condiment objects with price
   * @returns {Number} - The additional price
   */
  exports.calculateCondimentsPrice = (selectedCondiments = []) => {
    let additionalPrice = 0;
    
    if (selectedCondiments && selectedCondiments.length > 0) {
      for (const condiment of selectedCondiments) {
        additionalPrice += condiment.price || 0;
      }
    }
    
    return Math.round(additionalPrice * 100) / 100;
  };
  
  /**
   * Get default condiments from a product
   * 
   * @param {Object} product - The product object with condiments array
   * @returns {Array} - Array of default condiments
   */
  exports.getDefaultCondiments = (product) => {
    if (!product || !product.condiments || !Array.isArray(product.condiments)) {
      return [];
    }
    
    return product.condiments
      .filter(condiment => condiment.isDefault)
      .map(condiment => ({
        condimentId: condiment._id,
        name: condiment.name,
        price: condiment.price
      }));
  };
  
  /**
   * Validate selected condiments against available product condiments
   * 
   * @param {Array} selectedCondiments - Array of selected condiment objects
   * @param {Object} product - The product object with available condiments
   * @returns {Object} - Contains validity and validated condiments
   */
  exports.validateSelectedCondiments = (selectedCondiments = [], product) => {
    if (!product || !product.condiments || !Array.isArray(product.condiments)) {
      return { isValid: false, message: 'Product has no condiments', validatedCondiments: [] };
    }
    
    const validatedCondiments = [];
    
    for (const selected of selectedCondiments) {
      const matchingCondiment = product.condiments.find(
        c => c._id.toString() === selected.condimentId
      );
      
      if (!matchingCondiment) {
        return {
          isValid: false,
          message: `Condiment with ID ${selected.condimentId} does not exist for this product`,
          validatedCondiments: []
        };
      }
      
      validatedCondiments.push({
        condimentId: matchingCondiment._id,
        name: matchingCondiment.name,
        price: matchingCondiment.price
      });
    }
    
    return {
      isValid: true,
      validatedCondiments
    };
  };