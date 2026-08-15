import mongoose from "mongoose";
import { MongoEventStore } from "./src/core/events/event-store.impl.js";
import { CommunityEventModel } from "./src/models/communityEvent.js";

const uri = process.env.MONGODB_TEST_URL || "mongodb://127.0.0.1:27018/clubhouse_ownership_test";
await mongoose.connect(uri);
await CommunityEventModel.deleteMany({});
const store = new MongoEventStore();
const event = {
  id: "evt-1",
  tenantId: "tenant-1",
  botId: "bot-1",
  roomId: "room-1",
  platform: "clubhouse",
  type: "message.created",
  timestamp: new Date(),
  payload: {},
};
await store.persist(event);
const a = await store.claim("evt-1", "tenant-1");
console.log("A claim:", JSON.stringify(a));
const doc1 = await CommunityEventModel.findById("evt-1").lean();
console.log("after A:", { status: doc1?.status, updatedAt: doc1?.updatedAt, claimId: doc1?.claimId });

await CommunityEventModel.updateOne({ _id: "evt-1" }, { $set: { updatedAt: new Date(Date.now() - 10 * 60 * 1000) } });
const doc2 = await CommunityEventModel.findById("evt-1").lean();
console.log("after manual stale:", { status: doc2?.status, updatedAt: doc2?.updatedAt });

const b = await store.claim("evt-1", "tenant-1");
console.log("B claim:", JSON.stringify(b));
const doc3 = await CommunityEventModel.findById("evt-1").lean();
console.log("after B:", { status: doc3?.status, updatedAt: doc3?.updatedAt, claimId: doc3?.claimId });
await mongoose.disconnect();
