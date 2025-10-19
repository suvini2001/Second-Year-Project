import mongoose from 'mongoose';

const connectToMongoDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log('MongoDB connected successfully');
    });

    await mongoose.connect(`${process.env.MONGODB_URI}/DocOp`)
};

export default connectToMongoDB;
