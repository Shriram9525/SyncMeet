import httpStatus from "http-status";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Meeting } from "../models/meeting.model.js";

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Please provide both username and password" })
    }

    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log(`Login failed: User not found for username "${username}"`);
            return res.status(httpStatus.NOT_FOUND).json({ message: "User Not Found" })
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password)

        if (isPasswordCorrect) {
            // Generate a JWT token
            const token = jwt.sign(
                { username: user.username, id: user._id },
                process.env.JWT_SECRET || "fallback_secret"
            );

            user.token = token;
            await user.save();
            console.log(`Login successful: User "${username}" authenticated`);
            return res.status(httpStatus.OK).json({ token: token })
        } else {
            console.log(`Login failed: Incorrect password for username "${username}"`);
            return res.status(httpStatus.UNAUTHORIZED).json({ message: "Invalid Username or password" })
        }

    } catch (e) {
        console.error("Login Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` })
    }
}

const register = async (req, res) => {
    const { name, username, password } = req.body;

    if (!name || !username || !password) {
        return res.status(400).json({ message: "Please provide all required fields: name, username, and password" })
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log(`Registration conflict: Username "${username}" already exists`);
            return res.status(httpStatus.CONFLICT).json({ message: "Username already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name: name,
            username: username,
            password: hashedPassword
        });

        await newUser.save();
        console.log(`Registration successful: User "${username}" created`);
        return res.status(httpStatus.CREATED).json({ message: "User Registered" })

    } catch (e) {
        console.error("Registration Error:", e);
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: `Something went wrong: ${e.message}` })
    }
}

const getUserHistory = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ message: "Token is required" });
    }

    try {
        // Decode JWT token to get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }
        const meetings = await Meeting.find({ user_id: user.username })
        res.json(meetings)
    } catch (e) {
        console.error("getUserHistory Error:", e);
        res.status(500).json({ message: `Something went wrong: ${e.message}` })
    }
}

const addToHistory = async (req, res) => {
    const { token, meeting_code } = req.body;

    if (!token || !meeting_code) {
        return res.status(400).json({ message: "Token and meeting code are required" });
    }

    try {
        // Decode JWT token to get user info
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) {
            return res.status(httpStatus.NOT_FOUND).json({ message: "User not found" });
        }

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code
        })

        await newMeeting.save();
        res.status(httpStatus.CREATED).json({ message: "Added code to history" })
    } catch (e) {
        console.error("addToHistory Error:", e);
        res.status(500).json({ message: `Something went wrong: ${e.message}` })
    }
}


const getProfile = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token is required" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user);
    } catch (e) {
        console.error("getProfile Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const updateProfile = async (req, res) => {
    const { token, name, displayName, profilePicture } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        if (name !== undefined) user.name = name;
        if (displayName !== undefined) user.displayName = displayName;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;

        await user.save();
        console.log(`Profile updated for user "${decoded.username}"`);
        return res.status(200).json({ message: "Profile updated successfully", user });
    } catch (e) {
        console.error("updateProfile Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const changePassword = async (req, res) => {
    const { token, oldPassword, newPassword } = req.body;
    if (!token || !oldPassword || !newPassword) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();
        console.log(`Password changed for user "${decoded.username}"`);
        return res.status(200).json({ message: "Password updated successfully" });
    } catch (e) {
        console.error("changePassword Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const logoutAll = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        // Invalidate current and all past tokens by clearing the stored token in DB
        user.token = "";
        await user.save();
        console.log(`User "${decoded.username}" logged out from all devices`);
        return res.status(200).json({ message: "Logged out from all devices successfully" });
    } catch (e) {
        console.error("logoutAll Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const scheduleMeeting = async (req, res) => {
    const { token, meeting_code, scheduled_time } = req.body;
    if (!token || !meeting_code || !scheduled_time) {
        return res.status(400).json({ message: "Token, meeting code, and scheduled time are required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const newMeeting = new Meeting({
            user_id: user.username,
            meetingCode: meeting_code,
            date: new Date(),
            isScheduled: true,
            scheduledTime: new Date(scheduled_time)
        });

        await newMeeting.save();
        console.log(`Meeting "${meeting_code}" scheduled by "${user.username}"`);
        return res.status(201).json({ message: "Meeting scheduled successfully" });
    } catch (e) {
        console.error("scheduleMeeting Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const getScheduledMeetings = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: "Token is required" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        const meetings = await Meeting.find({ user_id: user.username, isScheduled: true });
        return res.status(200).json(meetings);
    } catch (e) {
        console.error("getScheduledMeetings Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const deleteMeetingFromHistory = async (req, res) => {
    const { token, meetingId } = req.body;
    if (!token || !meetingId) {
        return res.status(400).json({ message: "Token and meeting ID are required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        await Meeting.findOneAndDelete({ _id: meetingId, user_id: user.username });
        console.log(`Meeting ID "${meetingId}" deleted from history for user "${user.username}"`);
        return res.status(200).json({ message: "Meeting deleted from history successfully" });
    } catch (e) {
        console.error("deleteMeetingFromHistory Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

const clearAllHistory = async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: "Token is required" });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
        const user = await User.findOne({ username: decoded.username });
        if (!user) return res.status(404).json({ message: "User not found" });

        await Meeting.deleteMany({ user_id: user.username, isScheduled: false });
        console.log(`All call history cleared for user "${user.username}"`);
        return res.status(200).json({ message: "History cleared successfully" });
    } catch (e) {
        console.error("clearAllHistory Error:", e);
        return res.status(500).json({ message: `Something went wrong: ${e.message}` });
    }
};

export { login, register, getUserHistory, addToHistory, getProfile, updateProfile, changePassword, logoutAll, scheduleMeeting, getScheduledMeetings, deleteMeetingFromHistory, clearAllHistory }