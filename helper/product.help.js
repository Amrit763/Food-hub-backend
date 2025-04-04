module.exports = (req, news) => {
    if (req.tags)
        news.tags = req.tags;
    if (req.name)
        news.name = req.name;
    if (req.categories)
        news.categories = req.categories;
    if (req.description)
        news.description = req.description;
    if (req.price)
        news.price = req.price;
    if (req.quantity)
        news.quantity = req.quantity;
    if (req.manufactureDate)
        news.manufactureDate = req.manufactureDate;
    if (req.expiryDate)
        news.expiryDate = req.expiryDate;
    return news;
}