import messageModel from '../models/messageModel.js';  
import appointmentModel from '../models/appointmentModel.js';  
  
// Get messages for an appointment  
const getMessages = async (req, res) => {  
  try {  
    const { appointmentId } = req.params;  
    const userId = req.userId || req.docId;  
    const userType = req.userType; // 'user' or 'doctor'  
      
    // Verify user has access to this appointment  
    const appointment = await appointmentModel.findById(appointmentId); 
    
    //If the appointment doesn’t exist → unauthorized.
    //If the logged-in person’s ID doesn’t match either the user or doctor assigned to this appointment → unauthorized.
    if (!appointment || (appointment.userId.toString() !== userId && appointment.docId.toString() !== userId)) {  
      return res.json({ success: false, message: 'Unauthorized' });  
    }  

    // Mark messages as read (add readAt timestamp) and broadcast a read receipt
    const recipientType = userType === 'user' ? 'doctor' : 'user';
    const readAt = new Date();
    await messageModel.updateMany(
      { appointmentId: appointmentId, senderType: recipientType, isRead: false },
      { $set: { isRead: true, readAt } }
    );
    // Emit to appointment room so the sender flips to ✓✓ immediately
    try {
      if (global.io) {
        global.io.to(`appointment-${appointmentId}`).emit('messages-read', {
          appointmentId,
          by: userType,
          readAt,
        });
      }
    } catch (emitErr) {
      // non-fatal
      console.error('Failed to emit messages-read from getMessages:', emitErr?.message || emitErr);
    }
    
    //If authorization passes, it retrieves all messages from the database where appointmentId matches.
    const messages = await messageModel.find({ appointmentId }).sort({ timestamp: 1 });  
    res.json({ success: true, messages });  
  } catch (error) {  
    res.json({ success: false, message: error.message });  
  }  
};  
  
export { getMessages };