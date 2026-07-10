import mongoose, { Schema } from "mongoose";

const userScheme = new Schema(
    {
        name: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        token: { type: String },
        displayName: { type: String },
        profilePicture: { type: String, default: "" }
    }
)

const User = mongoose.model("User", userScheme);

export { User };