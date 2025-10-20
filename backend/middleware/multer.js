import multer from 'multer';  // imports multer package

const storage = multer.diskStorage  // tells Multer to store files on your computer’s disk with original filename
({
    filename: function (req, file, callback) // filename: is a rule that defines what name the uploaded file should have when saved.

                                            // req: The HTTP request object.
                                            // file: info the uploaded file.
                                            // callback: tells Multer when you’re done defining the name.
    
    {
        callback(null, file.originalname);  // here we use original file name when saving
    }
});

const upload = multer({ storage: storage }); // This line actually creates an upload handler (a middleware) that uses the storage rule you defined above.

export default upload; // Now you can import and use upload in your route files to handle file uploads.

