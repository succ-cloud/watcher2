// Import mongoose - this is our database library
const mongoose = require('mongoose');

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Connect to MongoDB using the connection string from .env file
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options help with connection stability
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // If connection is successful, log this message
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If connection fails, log the error and stop the application
    console.error('Database connection error:', error);
    process.exit(1); // Exit the application with error code
  }
};

// Export the function so we can use it in server.js
module.exports = connectDB;