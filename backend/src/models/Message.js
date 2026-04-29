import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    sender: { type: String, enum: ["doctor", "patient"], required: true },
    text: { type: String, required: true },
    time: { type: String, required: true },
  },
  { timestamps: true }
);

export const Message = mongoose.models.Message || mongoose.model("Message", messageSchema);
