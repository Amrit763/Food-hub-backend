// utils/file-utils.js
const fs = require('fs');
const path = require('path');

/**
 * Delete a file from the server's file system
 * @param {string} filePath - The path to the file to be deleted
 * @returns {boolean} - True if deletion was successful, false otherwise
 */
const deleteFile = (filePath) => {
  if (!filePath) return false;
  
  try {
    // Ensure the path is absolute
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(process.cwd(), filePath);
    
    // Check if file exists and delete it
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      console.log(`Successfully deleted file: ${absolutePath}`);
      return true;
    } else {
      console.log(`File does not exist: ${absolutePath}`);
      return false;
    }
  } catch (err) {
    console.error(`Error deleting file ${filePath}:`, err);
    return false;
  }
};

module.exports = {
  deleteFile
};