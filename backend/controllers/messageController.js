import messageModel from '../models/messageModel.js';  
import appointmentModel from '../models/appointmentModel.js';  
import mongoose from 'mongoose';
  
// This function provides an API endpoint to:
// Fetch chat messages for a specific appointment (like a chat session between doctor and user).
// Load messages in reverse chronological order (newest → oldest).
// Paginate results (limit number of messages returned).
// Support “load older messages” when scrolling up.
// Not automatically mark messages as read (Socket event preferred),
// but we also mark on fetch to satisfy "open chat flips to read" UX.

const getMessages = async (req, res) => {  
  try {  
    const { appointmentId } = req.params;  
    const userId = req.userId || req.docId;  
      
    // Verify user has access to this appointment  --veryfy only the doctor or user of that apointment can see it's message
    const appointment = await appointmentModel.findById(appointmentId).lean(); // lean ()- return a plain json object
    if (!appointment || (String(appointment.userId) !== String(userId) && String(appointment.docId) !== String(userId))) {  
      return res.json({ success: false, message: 'Unauthorized' });  
    }  

    // Parse pagination params
    const limitParam = parseInt(req.query.limit, 10);  // Reads limit from query string and converts to integer.
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 50; 
    const { before } = req.query || {};  //If req.query is somehow undefined (it normally isn’t, but just in case),then it falls back to {} so the app doesn’t crash.


    //Build the DB filter and support before being timestamp or message id
    const filter = { appointmentId }; //only messages from that apointment
    // Support before as ISO timestamp or message _id
    if (before && typeof before === 'string') { // before can represent either a date/time or message ID 
      let cutoffDate = null;
      // Try ISO date first
      const dateCandidate = new Date(before);
      if (!isNaN(dateCandidate.getTime())) {
        cutoffDate = dateCandidate;
      } else if (mongoose.isValidObjectId(before)) {
        // Resolve _id to its timestamp
        const anchor = await messageModel.findById(before).select('timestamp').lean();
        cutoffDate = anchor?.timestamp || null;
      }
      if (cutoffDate) {
        filter.timestamp = { $lt: cutoffDate }; //Find all messages where timestamp is less than (earlier than) this cutoff date.”
      }
    }

    // Fetch most recent first
    const messages = await messageModel
      .find(filter)
      .sort({ timestamp: -1, _id: -1 }) //Sorts by timestamp descending (-1) so newest messages come first. _id: -1 ensures a deterministic order if timestamps are equal.
      .limit(limit)
      .lean();

    // Mark opposite side's unread messages as read with timestamp (read receipt)
    try {
      const viewerType = req.userId ? 'user' : (req.docId ? 'doctor' : null);
      if (viewerType) {
        const opposite = viewerType === 'user' ? 'doctor' : 'user';
        const readAt = new Date();
        const result = await messageModel.updateMany(
          { appointmentId, senderType: opposite, isRead: false },
          { $set: { isRead: true, readAt } }
        );
        // If any messages were updated, notify sockets in this appointment room
        if (result?.modifiedCount > 0 && global.io) {
          try {
            global.io.to(`appointment-${appointmentId}`).emit('messages-read', { appointmentId, by: viewerType, readAt });
          } catch (_) {}
        }
      }
    } catch (_) {}

    // Compute cursor and hasMore
    let cursor = null; //stores info about the oldest message in this batch.
    let hasMore = false;   //a boolean (true/false) that tells if there are still older messages in the database.
    if (messages.length > 0) {
      const oldest = messages[messages.length - 1]; //oldest message is fetched

      //We build a “cursor object” for the frontend to use next time.It contains:before: the timestamp (converted to a readable ISO format if possible)id: the unique _id of that message
      cursor = { before: oldest.timestamp?.toISOString?.() || oldest.timestamp, id: oldest._id };
      // Check if older messages exist
      const olderCount = await messageModel.countDocuments({ appointmentId, timestamp: { $lt: oldest.timestamp } });
      hasMore = olderCount > 0;
    }

    return res.json({ success: true, messages, cursor, hasMore, limit });
  } catch (error) {  
    return res.json({ success: false, message: error.message });  
  }  
};  
  
export { getMessages };


// Pagination in getMessages function (Short Note)
// Pagination is used to load chat messages in small parts instead of all at once.
// In this code:
// Query parameters:
// limit → number of messages to fetch (default 50, max 200)
// before → a timestamp or message ID to load older messages before that point
// Database filter: messages are fetched with
// { appointmentId, timestamp: { $lt: cutoffDate } }
// so only older messages are returned.
// Sorting: messages are sorted by timestamp (newest → oldest).
// Cursor: backend sends back a cursor (timestamp + id of oldest message) and a hasMore flag,
// so the frontend knows where to continue loading from and whether more history exists.
// Purpose: improves performance and enables lazy-loading (load more on scroll-up) instead of loading all messages at once.