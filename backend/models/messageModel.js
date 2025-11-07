import mongoose from 'mongoose';  
  
const messageSchema = new mongoose.Schema({  
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'appointment', required: true },  
//This creates a foreign key relationship to your existing appointment system.  
// This design ensures messages are always tied to a specific
//  appointment, preventing unauthorized conversations between patients and doctors who don't have a booking relationship.
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },  
  senderType: { type: String, enum: ['user', 'doctor'], required: true },  
  message: { type: String, required: true },  
  timestamp: { type: Date, default: Date.now },  
  isRead: { type: Boolean, default: false }  ,
  clientMessageId: { type: String, index: true },
  readAt: { type: Date, default: null },
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
); // Prevents duplicates on retry (same sender + same message ID can’t be stored twice)
  
export default mongoose.model('message', messageSchema);