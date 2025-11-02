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
  isRead: { type: Boolean, default: false }  
});  
  
export default mongoose.model('message', messageSchema);