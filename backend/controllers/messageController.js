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

    // Mark messages as read
    const recipientType = userType === 'user' ? 'doctor' : 'user';
    await messageModel.updateMany(
      { appointmentId: appointmentId, senderType: recipientType, isRead: false },
      { $set: { isRead: true } }
    );
    
    //If authorization passes, it retrieves all messages from the database where appointmentId matches.
    const messages = await messageModel.find({ appointmentId }).sort({ timestamp: 1 });  
    res.json({ success: true, messages });  
  } catch (error) {  
    res.json({ success: false, message: error.message });  
  }  
};  
  
export { getMessages };