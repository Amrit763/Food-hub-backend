// middleware/file-upload.js

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup storage for user profile images
const profileImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/profiles';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create a unique filename with user ID and timestamp
        const userId = req.user._id || 'unknown';
        const fileName = `user-${userId}-${Date.now()}${path.extname(file.originalname)}`;
        console.log(`Generated filename for profile image: ${fileName}`);
        cb(null, fileName);
    }
});

// Setup storage for chef certificate images
const chefCertificateStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/certificates';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `cert-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Setup storage for chef portfolio images
const chefPortfolioStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/portfolio';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `portfolio-${req.user._id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Setup storage for food product images
const productImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'uploads/products';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        cb(null, `product-${Date.now()}${path.extname(file.originalname)}`);
    }
});

// File filter to accept only images
const imageFileFilter = (req, file, cb) => {
    // Allow only image files
    const allowedFileTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedFileTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(new Error('Only image files are allowed!'), false);
    }
};

// Initialize upload middlewares
const uploadProfileImage = multer({
    storage: profileImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: imageFileFilter
}).single('profileImage');

const uploadChefCertificates = multer({
    storage: chefCertificateStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter
}).fields([
    { name: 'certificateImages', maxCount: 5 },
    { name: 'specialization', maxCount: 1 },
    { name: 'experience', maxCount: 1 },
    { name: 'bio', maxCount: 1 }
]);

const uploadChefPortfolio = multer({
    storage: chefPortfolioStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: imageFileFilter
}).array('portfolioImages', 10); // Max 10 portfolio images

const uploadProductImages = multer({
    storage: productImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: imageFileFilter
}).array('productImages', 5); // Max 5 product images per food item

// Create wrapper middlewares to handle errors
const handleProfileImageUpload = (req, res, next) => {
    console.log('Profile image upload middleware called');
    
    uploadProfileImage(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file too large)
            console.error('Multer error during profile image upload:', err);
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            // An unknown error occurred
            console.error('Unknown error during profile image upload:', err);
            return res.status(500).json({
                success: false,
                message: `Server error during upload: ${err.message}`
            });
        } else if (req.fileValidationError) {
            // File type validation error
            console.error('File validation error:', req.fileValidationError);
            return res.status(400).json({
                success: false,
                message: req.fileValidationError
            });
        }
        
        // If file was uploaded, update user's profile image field
        if (req.file) {
            console.log('Profile image uploaded successfully:', req.file.path);
            // Store the normalized path in the request body
            req.body.profileImage = req.file.path.replace(/\\/g, '/');
            console.log('profileImage field in req.body set to:', req.body.profileImage);
        } else {
            console.log('No profile image file in request');
        }
        
        next();
    });
};

const handleChefCertificatesUpload = (req, res, next) => {
    uploadChefCertificates(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                message: `Server error during upload: ${err.message}`
            });
        } else if (req.fileValidationError) {
            return res.status(400).json({
                success: false,
                message: req.fileValidationError
            });
        }
        
        // Store form fields
        req.formFields = {
            specialization: req.body.specialization,
            experience: req.body.experience,
            bio: req.body.bio
        };
        
        // Add file paths to formFields AND req.body
        if (req.files && req.files.certificateImages) {
            const certificateImagePaths = req.files.certificateImages.map(file => 
                file.path.replace(/\\/g, '/')
            );
            
            req.formFields.certificateImages = certificateImagePaths;
            req.body.certificateImages = certificateImagePaths;
            
            console.log('Certificate images saved to req.body:', req.body.certificateImages);
        }
        
        next();
    });
};

const handleChefPortfolioUpload = (req, res, next) => {
    uploadChefPortfolio(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                message: `Server error during upload: ${err.message}`
            });
        } else if (req.fileValidationError) {
            return res.status(400).json({
                success: false,
                message: req.fileValidationError
            });
        }
        
        // If files were uploaded, add paths to request body
        if (req.files && req.files.length > 0) {
            req.body.portfolioImages = req.files.map(file => 
                file.path.replace(/\\/g, '/')
            );
            console.log('Portfolio images saved to req.body:', req.body.portfolioImages);
        }
        
        next();
    });
};

const handleProductImagesUpload = (req, res, next) => {
    uploadProductImages(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(500).json({
                success: false,
                message: `Server error during upload: ${err.message}`
            });
        } else if (req.fileValidationError) {
            return res.status(400).json({
                success: false,
                message: req.fileValidationError
            });
        }
        
        // If files were uploaded, add paths to request body
        if (req.files && req.files.length > 0) {
            req.body.images = req.files.map(file => 
                file.path.replace(/\\/g, '/')
            );
            console.log('Product images saved to req.body:', req.body.images);
        }
        
        next();
    });
};

module.exports = {
    handleProfileImageUpload,
    handleChefCertificatesUpload,
    handleChefPortfolioUpload,
    handleProductImagesUpload
};