import Room from '../models/Room.js';
import bcrypt from 'bcryptjs';

// Create a Room
export const createRoom = async (req, res) => {
  try {
    const { name, isPrivate, password } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    let hashedPassword = '';
    if (isPrivate) {
      if (!password || password.length < 4) {
        return res.status(400).json({ message: 'Private rooms require a password of at least 4 characters' });
      }
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const room = await Room.create({
      name: name.trim(),
      owner: userId,
      isPrivate: !!isPrivate,
      password: hashedPassword,
      participants: [userId]
    });

    // Strip password before returning
    const returnRoom = room.toObject();
    delete returnRoom.password;

    res.status(201).json(returnRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Public Rooms
export const getPublicRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ isPrivate: false })
      .populate('owner', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture')
      .sort({ createdAt: -1 });

    const sanitizedRooms = rooms.map(r => {
      const obj = r.toObject();
      delete obj.password;
      return obj;
    });

    res.json(sanitizedRooms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Join a Room
export const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.isPrivate) {
      if (!password) {
        return res.status(401).json({ message: 'Password is required to join this private room' });
      }
      const isMatch = await bcrypt.compare(password, room.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect password' });
      }
    }

    // Add user to participants if not already inside
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    const populated = await Room.findById(roomId)
      .populate('owner', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture firstName lastName');

    const returnRoom = populated.toObject();
    delete returnRoom.password;

    res.json(returnRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Leave a Room
export const leaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Remove user from participants
    room.participants = room.participants.filter(p => p.toString() !== userId.toString());

    if (room.participants.length === 0) {
      await room.deleteOne();
      return res.json({ message: 'Left room, room deleted because it is empty', roomDeleted: true });
    } else {
      if (room.owner.toString() === userId.toString()) {
        room.owner = room.participants[0];
      }
      await room.save();
    }

    res.json({ message: 'Left room successfully', roomDeleted: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Check if user is currently inside a room
export const getActiveRoom = async (req, res) => {
  try {
    const userId = req.user._id;
    const room = await Room.findOne({ participants: userId })
      .populate('owner', 'username profilePicture firstName lastName')
      .populate('participants', 'username profilePicture firstName lastName');

    if (!room) {
      return res.json(null);
    }

    const returnRoom = room.toObject();
    delete returnRoom.password;
    res.json(returnRoom);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
