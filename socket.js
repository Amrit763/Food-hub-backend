// socket.js
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const Chat = require('./models/chat.model');
const User = require('./models/user.model');

let io;

const initializeSocket = (server) => {
    io = socketIo(server, {
        cors: {
            origin: 'http://localhost:4200', // Angular dev server
            credentials: true
        }
    });

    // Socket middleware to authenticate users
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify JWT token
            const decoded = jwt.verify(token, config.jwtSecretKey);
            
            // Fetch user
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket authentication error:', error);
            next(new Error('Authentication error'));
        }
    });

    // Handle connections
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user._id}`);

        // Join user to their own room for private messages
        socket.join(socket.user._id.toString());

        // Join chat rooms
        socket.on('joinChat', async (chatId) => {
            try {
                // Verify that user has access to this chat
                const chat = await Chat.findById(chatId);
                
                if (!chat) {
                    return socket.emit('error', { message: 'Chat not found' });
                }

                const userId = socket.user._id.toString();
                const isAuthorized = 
                    chat.customer.toString() === userId || 
                    chat.chef.toString() === userId;

                if (!isAuthorized) {
                    return socket.emit('error', { message: 'Not authorized to join this chat' });
                }

                // Join the chat room
                socket.join(`chat:${chatId}`);
                console.log(`User ${userId} joined chat: ${chatId}`);
                
                socket.emit('chatJoined', { chatId });
            } catch (error) {
                console.error('Error joining chat:', error);
                socket.emit('error', { message: 'Error joining chat' });
            }
        });

        // Leave chat room
        socket.on('leaveChat', (chatId) => {
            socket.leave(`chat:${chatId}`);
            console.log(`User ${socket.user._id} left chat: ${chatId}`);
        });

        // New message handler
        socket.on('sendMessage', async (data) => {
            try {
                const { chatId, content } = data;
                const userId = socket.user._id;

                // Verify that user has access to this chat
                const chat = await Chat.findById(chatId);
                
                if (!chat) {
                    return socket.emit('error', { message: 'Chat not found' });
                }

                const isAuthorized = 
                    chat.customer.toString() === userId.toString() || 
                    chat.chef.toString() === userId.toString();

                if (!isAuthorized) {
                    return socket.emit('error', { message: 'Not authorized to send messages in this chat' });
                }

                // Create new message
                const newMessage = {
                    sender: userId,
                    content,
                    readBy: [userId], // Message is already read by sender
                    deletedBy: [],
                    createdAt: new Date()
                };

                // Add message to chat
                chat.messages.push(newMessage);
                
                // Update chat activity timestamp
                chat.lastActivity = new Date();
                
                // Reactivate chat if it was archived
                if (!chat.isActive) {
                    chat.isActive = true;
                }
                
                // Remove this user from deletedBy if they had deleted the chat before
                chat.deletedBy = chat.deletedBy.filter(id => id.toString() !== userId.toString());

                await chat.save();

                // Get the newly added message
                const addedMessage = chat.messages[chat.messages.length - 1];

                // Broadcast to chat room
                io.to(`chat:${chatId}`).emit('newMessage', {
                    message: addedMessage,
                    chatId
                });

                // Send notification to the other user if they're not in the chat room
                const recipientId = 
                    chat.customer.toString() === userId.toString() 
                        ? chat.chef.toString() 
                        : chat.customer.toString();
                
                socket.to(recipientId).emit('messageNotification', {
                    chatId,
                    message: addedMessage,
                    sender: {
                        _id: socket.user._id,
                        fullName: socket.user.fullName,
                        profileImage: socket.user.profileImage
                    }
                });
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Error sending message' });
            }
        });

        // Message read handler
        socket.on('markAsRead', async (data) => {
            try {
                const { chatId, messageIds } = data;
                const userId = socket.user._id;

                if (!messageIds || !messageIds.length) {
                    return;
                }

                // Update read status for each message
                await Chat.updateMany(
                    { 
                        _id: chatId, 
                        'messages._id': { $in: messageIds },
                        'messages.readBy': { $ne: userId }
                    },
                    { $addToSet: { 'messages.$[elem].readBy': userId } },
                    { arrayFilters: [{ '_id': { $in: messageIds }, 'readBy': { $ne: userId } }] }
                );

                // Notify room that messages were read
                io.to(`chat:${chatId}`).emit('messagesRead', {
                    chatId,
                    messageIds,
                    userId
                });
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        // Message delete handler
        socket.on('deleteMessage', async (data) => {
            try {
                const { chatId, messageId } = data;
                const userId = socket.user._id;

                // Find the chat
                const chat = await Chat.findById(chatId);
                
                if (!chat) {
                    return socket.emit('error', { message: 'Chat not found' });
                }

                // Check authorization
                const isAuthorized = 
                    chat.customer.toString() === userId.toString() || 
                    chat.chef.toString() === userId.toString();

                if (!isAuthorized) {
                    return socket.emit('error', { message: 'Not authorized to access this chat' });
                }

                // Find the message
                const messageIndex = chat.messages.findIndex(msg => 
                    msg._id.toString() === messageId
                );

                if (messageIndex === -1) {
                    return socket.emit('error', { message: 'Message not found' });
                }

                // Add user to message deletedBy array
                if (!chat.messages[messageIndex].deletedBy.some(id => id.toString() === userId.toString())) {
                    chat.messages[messageIndex].deletedBy.push(userId);
                }

                await chat.save();

                // Notify room about the deleted message
                io.to(`chat:${chatId}`).emit('messageDeleted', {
                    chatId,
                    messageId,
                    userId
                });
            } catch (error) {
                console.error('Error deleting message:', error);
                socket.emit('error', { message: 'Error deleting message' });
            }
        });

        // Disconnect handler
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.user._id}`);
        });
    });

    return io;
};

// Emit to specific user
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(userId.toString()).emit(event, data);
    }
};

// Emit to chat
const emitToChat = (chatId, event, data) => {
    if (io) {
        io.to(`chat:${chatId}`).emit(event, data);
    }
};

module.exports = {
    initializeSocket,
    emitToUser,
    emitToChat
};