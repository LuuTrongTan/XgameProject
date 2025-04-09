/**
 * Utility functions for handling file names, especially with Vietnamese characters
 * and encoding issues that often occur with file uploads and downloads.
 */

/**
 * Decodes a potentially badly encoded filename, handling various encoding issues
 * that commonly occur with Vietnamese characters.
 * 
 * @param {string} name - The encoded filename to decode
 * @returns {string} - The decoded filename
 */
export const decodeFileName = (name) => {
  if (!name) return 'Unnamed file';
  
  try {
    console.log('Original filename:', name);
    
    // Step 1: Try URI decoding
    if (name.includes('%')) {
      try {
        const decoded = decodeURIComponent(name);
        console.log('URI decoded filename:', decoded);
        return decoded;
      } catch (e) {
        console.warn('Failed to decode URI component:', e);
      }
    }
    
    // Step 2: Handle ISO-8859-1 / Latin1 encoding issue (common with Vietnamese)
    if (/Ã|Æ|Ä|Å|á»|Æ°|Ä'/.test(name)) {
      console.log('Detected possible Latin1-encoded Vietnamese text');
      try {
        // Create binary data from UTF-8 string misinterpreted as Latin1
        const bytes = new Uint8Array(name.length);
        for (let i = 0; i < name.length; i++) {
          bytes[i] = name.charCodeAt(i) & 0xFF;
        }
        
        // Try decoding with UTF-8
        const decoder = new TextDecoder('utf-8');
        const decoded = decoder.decode(bytes);
        
        // Check if result makes sense
        if (!/Ã|Æ|Ä|Å|á»/.test(decoded) && decoded !== name) {
          console.log('Successfully decoded Latin1 to UTF-8:', decoded);
          return decoded;
        }
      } catch (e) {
        console.warn('TextDecoder method failed:', e);
      }
    }
    
    // Step 3: Try using JavaScript's escape/unescape
    try {
      const escapedName = escape(name);
      if (escapedName !== name && escapedName.includes('%u')) {
        const unescapedName = unescape(escapedName);
        console.log('Escape/unescape method result:', unescapedName);
        if (unescapedName !== name) {
          return unescapedName;
        }
      }
    } catch (e) {
      console.warn('Escape/unescape method failed:', e);
    }
    
    // Step 4: Handle invalid UTF-8 characters
    if (/[\uFFFD\uD800-\uDFFF]/.test(name)) {
      console.log('Removing invalid UTF-8 characters from filename');
      return name.replace(/[\uFFFD\uD800-\uDFFF]/g, '');
    }
    
    // Return original name if all methods fail
    return name;
  } catch (error) {
    console.error('Error decoding filename:', error);
    // Return original name but remove invalid characters
    return name.replace(/[\uFFFD\uD800-\uDFFF]/g, '');
  }
};

/**
 * Gets the file extension from a filename
 * 
 * @param {string} filename - The filename to extract extension from
 * @returns {string} - The file extension (lowercase, without dot)
 */
export const getFileExtension = (filename) => {
  if (!filename) return '';
  
  // Extract extension (remove query params if any)
  const parts = filename.split('?')[0].split('.');
  if (parts.length <= 1) return '';
  
  return parts.pop().toLowerCase();
};

/**
 * Creates a safe filename for storage by removing special characters
 * and normalizing Vietnamese diacritics
 * 
 * @param {string} filename - The original filename
 * @returns {string} - A storage-safe filename
 */
export const createSafeFilename = (filename) => {
  if (!filename) return 'file';
  
  // First decode the filename
  const decodedName = decodeFileName(filename);
  
  // Extract extension
  const extension = getFileExtension(decodedName);
  
  // Get basename without extension
  let baseName = extension ? 
    decodedName.slice(0, decodedName.length - extension.length - 1) : 
    decodedName;
  
  // Normalize and remove diacritics
  baseName = baseName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  
  // If basename is empty, use 'file'
  if (!baseName) baseName = 'file';
  
  // Add timestamp for uniqueness
  const timestamp = Date.now();
  const randomString = Math.round(Math.random() * 1e9);
  
  // Return safe filename with original extension
  return `${timestamp}-${randomString}-${baseName}${extension ? '.' + extension : ''}`;
};

/**
 * Formats a file size in bytes to a human-readable string
 * 
 * @param {number} sizeInBytes - File size in bytes
 * @returns {string} - Formatted size string (e.g., "1.23 MB")
 */
export const formatFileSize = (sizeInBytes) => {
  if (!sizeInBytes && sizeInBytes !== 0) return '';
  
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(2)} KB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
};

export default {
  decodeFileName,
  getFileExtension,
  createSafeFilename,
  formatFileSize
}; 