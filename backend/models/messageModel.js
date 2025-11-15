import mongoose from 'mongoose';  
  
const messageSchema = new mongoose.Schema({  
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'appointment', required: true },  
//This creates a foreign key relationship to your existing appointment system.  
// This design ensures messages are always tied to a specific
//  appointment, preventing unauthorized conversations between patients and doctors who don't have a booking relationship.
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },  
  senderType: { type: String, enum: ['user', 'doctor'], required: true },  
  message: { type: String, trim: true, maxlength: 2000, default: '', required: function() { return this.type === 'text'; } },  
  timestamp: { type: Date, default: Date.now },  
  isRead: { type: Boolean, default: false }  ,
  clientMessageId: { type: String, index: true },
  readAt: { type: Date, default: null },

    // Add/extend fields in messageSchema
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' }, // file-->any non-image file (PDF, DOCX, ZIP, etc.)
  url: { type: String, default: null },            // CDN/Cloudinary URL
  mimeType: { type: String, default: null },        // the type of the file we need it to reject the unsupported files and to show the correct preview.
  size: { type: Number, default: null },           // bytes
  thumbnailUrl: { type: String, default: null },   // Most CDNs (Cloudinary) generate thumbnails automatically.
  filename: { type: String, default: null },       // original name
});  

// Indexes for performance and reliability
messageSchema.index({ appointmentId: 1, timestamp: 1 });  //Loads chat history quickly when you scroll a conversation
messageSchema.index({ appointmentId: 1, isRead: 1 }); //Counts unread messages efficiently
messageSchema.index({ senderId: 1, timestamp: -1 });  //Lets you fetch a sender’s messages (like “sent” history)
// Use a partial index so only documents that actually have a non-null clientMessageId are subject to the uniqueness constraint.
// This avoids E11000 duplicate key errors when older documents stored clientMessageId as null.
messageSchema.index(
  { senderId: 1, clientMessageId: 1 },
  // Use $type: 'string' to include only documents where clientMessageId is a string.
  // This avoids using $ne:null (rewritten as $not $eq null), which some server versions reject in partial indexes.
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string' } } }
);  // Prevents duplicates on retry (same sender + same message ID can’t be stored twice)
messageSchema.index({ appointmentId: 1, _id: -1 }); // imporve the chat message pagination.



  
export default mongoose.model('message', messageSchema);