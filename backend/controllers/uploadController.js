// //what does this endpoint do 
// Receives a file uploaded from the chat (via multer)
// Checks if the file type is allowed
// Checks if the file size is allowed
// Uploads the file to Cloudinary
// Creates a thumbnail for images
// Returns all the metadata back to the frontend
// This enables sending images and files inside the chat.

import { v2 as cloudinary } from 'cloudinary';

// Allowed types and limits
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;   // 5MB
const MAX_FILE_BYTES  = 20 * 1024 * 1024;  // 20MB
const IMAGE_MIMES = new Set(['image/jpeg','image/png','image/webp']);
const FILE_MIMES  = new Set([
  'application/pdf','text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);


export const uploadChatFile = async (req, res) => {
  try {
    const file = req.file; // this is created by multer
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { mimetype, size, originalname, path: localPath } = file;
    //localpath -->where multer temporirly saved it on disk

    // Determine type + limits
    const isImage = IMAGE_MIMES.has(mimetype);
    const isDoc   = FILE_MIMES.has(mimetype);
    const type = isImage ? 'image' : (isDoc ? 'file' : null);
    if (!type) return res.status(400).json({ success: false, message: 'Unsupported file type' });

    //check the file size
    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
    if (size > maxBytes) {
      return res.status(400).json({ success: false, message: `File too large (max ${isImage ? '5MB' : '20MB'})` });
    }

    // Upload to Cloudinary
    const uploadRes = await cloudinary.uploader.upload(localPath, {
      resource_type: 'auto' //makes Cloudinary accept both images and other file types
    });

    try {
      console.log('Cloudinary upload:', {
        resource_type: uploadRes?.resource_type,
        format: uploadRes?.format,
        public_id: uploadRes?.public_id
      });
    } catch (_) {}

    // Build delivery URLs
    const resourceType = uploadRes?.resource_type || (isImage ? 'image' : 'raw');
    const uploadType = uploadRes?.type || 'upload';
    let thumbnailUrl = null;
    let deliverUrl = uploadRes.secure_url; // safe default returned by Cloudinary

    if (uploadRes.public_id) {
      if (resourceType === 'image') {
        // Thumbnail and normalized image URL
        thumbnailUrl = cloudinary.url(uploadRes.public_id, {
          width: 360,
          crop: 'limit',
          secure: true,
          fetch_format: 'auto',
          resource_type: 'image',
          type: uploadType
        });
        deliverUrl = cloudinary.url(uploadRes.public_id, {
          secure: true,
          resource_type: 'image',
          fetch_format: 'auto',
          type: uploadType
        });
      } else {
        // For non-image (raw/video), provide an attachment URL to force download
        deliverUrl = cloudinary.url(uploadRes.public_id, {
          secure: true,
          resource_type: resourceType,
          flags: 'attachment',
          type: uploadType
        });
      }
    }

    //Return the final metadata to frontend
    return res.json({
      success: true,
      file: {
        type,
        url: deliverUrl, // delivery URL (image via image pipeline, docs via raw + attachment)
        mimeType: mimetype,
        size, //in bytes
        filename: originalname,
        thumbnailUrl //small preview (for images)
      }
    });
  } catch (err) {
    console.error('uploadChatFile error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

