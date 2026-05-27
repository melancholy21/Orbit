import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// Get all conversations for a user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'username profilePicture firstName lastName')
    .populate('lastMessage')
    .sort({ updatedAt: -1 });
    
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          sender: { $ne: req.user._id },
          readBy: { $ne: req.user._id }
        });
        return {
          ...conv.toObject(),
          unreadCount
        };
      })
    );

    res.json(conversationsWithUnread);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get messages in a specific conversation (or with a specific user)
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params; // The ID of the other user

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    });

    if (!conversation) {
      return res.json([]);
    }

    // Mark messages from the other user as read
    await Message.updateMany(
      {
        conversationId: conversation._id,
        sender: userId,
        readBy: { $ne: req.user._id }
      },
      {
        $addToSet: { readBy: req.user._id }
      }
    );

    const limit = parseInt(req.query.limit) || 100;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ conversationId: conversation._id })
      .populate('sender', 'username profilePicture firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    messages.reverse();

    res.json({ conversationId: conversation._id, messages });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, text, image } = req.body;
    const senderId = req.user._id;

    if ((!text || !text.trim()) && !image) {
      return res.status(400).json({ message: 'Message text or image is required' });
    }

    // Verify mutual follow
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMutualFollow = sender.following.includes(receiverId) && receiver.following.includes(senderId);
    if (!isMutualFollow) {
      return res.status(403).json({ message: 'You must follow each other to send messages' });
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] }
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId]
      });
    }

    const newMessage = await Message.create({
      conversationId: conversation._id,
      sender: senderId,
      text: text?.trim(),
      image,
      readBy: [senderId]
    });

    // Update conversation last message
    conversation.lastMessage = newMessage._id;
    await conversation.save();

    const populatedMessage = await newMessage.populate('sender', 'username profilePicture firstName lastName');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit a message text
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    message.text = text?.trim();
    await message.save();

    const populatedMessage = await message.populate('sender', 'username profilePicture firstName lastName');
    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    const conversationId = message.conversationId;
    await message.deleteOne();

    // If it was the last message, update the conversation's lastMessage
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage?.toString() === messageId) {
      const remainingMessages = await Message.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(1);
      
      conversation.lastMessage = remainingMessages.length > 0 ? remainingMessages[0]._id : null;
      await conversation.save();
    }

    res.json({ message: 'Message deleted successfully', messageId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark conversation messages as read
export const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, userId] }
    });

    if (conversation) {
      await Message.updateMany(
        {
          conversationId: conversation._id,
          sender: userId,
          readBy: { $ne: req.user._id }
        },
        {
          $addToSet: { readBy: req.user._id }
        }
      );
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
