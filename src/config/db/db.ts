import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

mongoose.set('strictQuery', true);

function normalizeMongoURL(url: string | undefined): string {
  if (!url) {
    return 'mongodb://127.0.0.1:27017/clubhouse';
  }
  return url.replace('mongodb://localhost', 'mongodb://127.0.0.1');
}

interface ConnectionParams {
  useNewUrlParser: boolean;
  useUnifiedTopology: boolean;
  serverSelectionTimeoutMS: number;
  family: number;
}

const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const mongoURL = normalizeMongoURL(process.env.MONGODB_URL);
    console.log('Connecting to MongoDB:', mongoURL.replace(/\/\/.*@/, '//***@'));

    const connectionParams: ConnectionParams = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    };

    await mongoose.connect(mongoURL, connectionParams);
    console.log('✓ Connected to Database successfully');
    return mongoose;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('✗ Database connection failed:', message);
    console.error('  Connection URL:', normalizeMongoURL(process.env.MONGODB_URL));
    console.error('  Make sure MongoDB is running on 127.0.0.1:27017');
    process.exit(1);
  }
};

export default connectDB;
