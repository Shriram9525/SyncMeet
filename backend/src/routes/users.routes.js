import { Router } from "express";
import { addToHistory, getUserHistory, login, register, getProfile, updateProfile, changePassword, logoutAll, scheduleMeeting, getScheduledMeetings, deleteMeetingFromHistory, clearAllHistory } from "../controllers/user.controller.js";



const router = Router();

router.route("/login").post(login)
router.route("/register").post(register)
router.route("/add_to_activity").post(addToHistory)
router.route("/get_all_activity").get(getUserHistory)
router.route("/profile").get(getProfile).put(updateProfile)
router.route("/change_password").put(changePassword)
router.route("/logout_all").post(logoutAll)
router.route("/schedule").post(scheduleMeeting)
router.route("/scheduled").get(getScheduledMeetings)
router.route("/delete_history").post(deleteMeetingFromHistory)
router.route("/clear_history").post(clearAllHistory)

export default router;