import React, { useEffect, useRef, useState, useContext } from 'react'
import io from "socket.io-client";
import { 
    Badge, 
    IconButton, 
    TextField, 
    Snackbar, 
    Alert, 
    Button, 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogContentText, 
    DialogActions,
    Drawer,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider,
    CircularProgress,
    Box,
    Typography,
    Card
} from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff'
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare'
import ChatIcon from '@mui/icons-material/Chat'
import PanToolIcon from '@mui/icons-material/PanTool';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import PeopleIcon from '@mui/icons-material/People';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import PinDropIcon from '@mui/icons-material/PinDrop';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import server from '../environment';
import { ThemeContext } from '../contexts/ThemeContext';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    const { themeMode } = useContext(ThemeContext);

    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(true);
    let [audio, setAudio] = useState(true);
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(false);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [messages, setMessages] = useState([])
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState("");
    const videoRef = useRef([])
    let [videos, setVideos] = useState([])

    // Theme & State Enhancements
    const [waitingRoomState, setWaitingRoomState] = useState("idle"); // "idle" | "waiting" | "admitted" | "rejected"
    const [isHost, setIsHost] = useState(false);
    const [waitingList, setWaitingList] = useState([]);
    const [showParticipants, setShowParticipants] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [connectionStatus, setConnectionStatus] = useState("Disconnected");
    const [isRecording, setIsRecording] = useState(false);
    const [pinnedId, setPinnedId] = useState(null);
    const [activeSpeakerId, setActiveSpeakerId] = useState(null);
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);

    // Sync helpers
    const [localHandRaised, setLocalHandRaised] = useState(false);
    const [raisedHands, setRaisedHands] = useState({});
    const [userNames, setUserNames] = useState({});
    const [showEmojiTray, setShowEmojiTray] = useState(false);
    const [reactions, setReactions] = useState([]);
    const [notification, setNotification] = useState("");
    const [toastSeverity, setToastSeverity] = useState("info");

    const localHandRaisedRef = useRef(false);
    const usernameRef = useRef("");
    const screenRef = useRef(false);
    const prevVideoStateRef = useRef(true);
    const audioAnalysersRef = useRef({});
    const chatEndRef = useRef(null);

    useEffect(() => {
        localHandRaisedRef.current = localHandRaised;
    }, [localHandRaised]);

    useEffect(() => {
        usernameRef.current = username;
    }, [username]);

    // Meeting duration timer
    useEffect(() => {
        let timerInterval;
        if (waitingRoomState === "admitted") {
            timerInterval = setInterval(() => {
                setElapsedTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(timerInterval);
    }, [waitingRoomState]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key.toLowerCase();
            if (key === 'm') handleAudio();
            if (key === 'v') handleVideo();
            if (key === 'c') setModal(prev => !prev);
            if (key === 'p') setShowParticipants(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [video, audio]);

    // Auto scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        getPermissions();
    }, []);

    const showToast = (msg, severity = "info") => {
        setNotification(msg);
        setToastSeverity(severity);
    };

    // Speaking Detection
    const startAudioDetection = (stream, socketId) => {
        try {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) return;

            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const checkVolume = () => {
                if (!audioAnalysersRef.current[socketId]) return;
                analyser.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;
                if (average > 25) { 
                    setActiveSpeakerId(socketId);
                } else if (activeSpeakerId === socketId) {
                    // Turn off after a small period
                    setTimeout(() => {
                        setActiveSpeakerId(prev => prev === socketId ? null : prev);
                    }, 1500);
                }
                setTimeout(checkVolume, 300);
            };

            audioAnalysersRef.current[socketId] = { audioContext, source, analyser };
            checkVolume();
        } catch (e) {
            console.warn("Could not start audio detection:", e);
        }
    };

    const stopAudioDetection = (socketId) => {
        if (audioAnalysersRef.current[socketId]) {
            try {
                audioAnalysersRef.current[socketId].audioContext.close();
            } catch (e) {}
            delete audioAnalysersRef.current[socketId];
        }
    };

    const getPermissions = async () => {
        try {
            // Request both video and audio in a single call to prevent device locking
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                .catch(async () => {
                    // Fallback to video only
                    return await navigator.mediaDevices.getUserMedia({ video: true })
                        .catch(async () => {
                            // Fallback to audio only
                            return await navigator.mediaDevices.getUserMedia({ audio: true })
                                .catch(() => null);
                        });
                });

            if (stream) {
                const hasVideo = stream.getVideoTracks().length > 0;
                const hasAudio = stream.getAudioTracks().length > 0;
                setVideoAvailable(hasVideo);
                setAudioAvailable(hasAudio);
                setVideo(hasVideo);
                setAudio(hasAudio);

                window.localStream = stream;
                if (localVideoref.current) {
                    localVideoref.current.srcObject = stream;
                }
                startAudioDetection(stream, "local");
            } else {
                setVideoAvailable(false);
                setAudioAvailable(false);
                setVideo(false);
                setAudio(false);
                
                let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
                window.localStream = blackSilence();
                if (localVideoref.current) {
                    localVideoref.current.srcObject = window.localStream;
                }
            }

            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            }
        } catch (error) {
            console.error("Error in getPermissions:", error);
        }
    };

    const getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }
        startAudioDetection(stream, "local");

        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            const senders = connections[id].getSenders();
            
            if (videoTrack) {
                const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack).catch(e => console.warn(e));
                }
            }
            if (audioTrack) {
                const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
                if (audioSender) {
                    audioSender.replaceTrack(audioTrack).catch(e => console.warn(e));
                }
            }
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);

            try {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(t => t.stop());
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()]);
            window.localStream = blackSilence();
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            const newVideoTrack = window.localStream.getVideoTracks()[0];
            const newAudioTrack = window.localStream.getAudioTracks()[0];

            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                const senders = connections[id].getSenders();
                if (newVideoTrack) {
                    const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
                    if (videoSender) videoSender.replaceTrack(newVideoTrack).catch(e => console.warn(e));
                }
                if (newAudioTrack) {
                    const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');
                    if (audioSender) audioSender.replaceTrack(newAudioTrack).catch(e => console.warn(e));
                }
            }
        });
    };

    const getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(t => t.enabled = videoAvailable);
            window.localStream.getAudioTracks().forEach(t => t.enabled = audioAvailable);
        }
    };

    const getUserMedia = () => {
        // Handled via track state enablement toggling directly
    };

    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    const connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false })
        setConnectionStatus("Connecting...");

        socketRef.current.on('signal', gotMessageFromServer)

        socketRef.current.on('connect', () => {
            setConnectionStatus("Connected");
            // Pass username upon joining
            socketRef.current.emit('join-call', window.location.href, username)
            socketIdRef.current = socketRef.current.id

            socketRef.current.on('chat-message', addMessage)

            socketRef.current.on('user-left', (id) => {
                const leavingUser = userNames[id] || "Participant";
                showToast(`${leavingUser} left the meeting`, "info");
                stopAudioDetection(id);
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            })

            // Waiting room events
            socketRef.current.on('waiting-room-joined', () => {
                setWaitingRoomState("waiting");
            });

            socketRef.current.on('waiting-room-admitted', () => {
                setWaitingRoomState("admitted");
                showToast("Admitted to the meeting room!");
                getMedia();
            });

            socketRef.current.on('waiting-room-rejected', () => {
                setWaitingRoomState("rejected");
            });

            socketRef.current.on('user-waiting', (list) => {
                setWaitingList(list || []);
                if (list && list.length > 0) {
                    showToast(`${list[list.length - 1].username} is in the waiting room`, "warning");
                }
            });

            socketRef.current.on('host-promoted', (data) => {
                setIsHost(true);
                setWaitingList(data.waitingList || []);
                showToast("You are now the host of this meeting!", "success");
            });

            socketRef.current.on('kicked', () => {
                showToast("You were kicked from the meeting room.", "error");
                setTimeout(() => {
                    window.location.href = "/home";
                }, 3000);
            });

            socketRef.current.on('user-joined', (id, clients) => {
                // Host calculation
                const amIHost = (clients[0] === socketIdRef.current);
                setIsHost(amIHost);

                const newlyJoinedUser = userNames[id] || "A participant";
                if (id !== socketIdRef.current) {
                    showToast(`${newlyJoinedUser} joined the meeting`);
                }

                clients.forEach((socketListId) => {
                    if (connections[socketListId] === undefined) {
                        connections[socketListId] = new RTCPeerConnection(peerConfigConnections)
                        
                        connections[socketListId].onicecandidate = function (event) {
                            if (event.candidate != null) {
                                socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                            }
                        }

                        connections[socketListId].onaddstream = (event) => {
                            let videoExists = videoRef.current.find(video => video.socketId === socketListId);
                            startAudioDetection(event.stream, socketListId);

                            if (videoExists) {
                                setVideos(videos => {
                                    const updatedVideos = videos.map(video =>
                                        video.socketId === socketListId ? { ...video, stream: event.stream } : video
                                    );
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                });
                            } else {
                                let newVideo = {
                                    socketId: socketListId,
                                    stream: event.stream,
                                    autoplay: true,
                                    playsinline: true
                                };

                                setVideos(videos => {
                                    const updatedVideos = [...videos, newVideo];
                                    videoRef.current = updatedVideos;
                                    return updatedVideos;
                                });
                            }
                        };

                        if (window.localStream !== undefined && window.localStream !== null) {
                            connections[socketListId].addStream(window.localStream)
                        } else {
                            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                            window.localStream = blackSilence()
                            connections[socketListId].addStream(window.localStream)
                        }
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue

                        try {
                            connections[id2].addStream(window.localStream)
                        } catch (e) { }

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                })
                                .catch(e => console.log(e))
                        })
                    }
                }

                // Send username and hand state to new participant
                if (id !== socketIdRef.current) {
                    socketRef.current.emit('share-status', id, {
                        username: usernameRef.current,
                        handRaised: localHandRaisedRef.current
                    });
                }
            })

            socketRef.current.on('share-status', (senderId, status) => {
                setUserNames(prev => ({ ...prev, [senderId]: status.username }));
                setRaisedHands(prev => ({ ...prev, [senderId]: status.handRaised }));
            });

            socketRef.current.on('raise-hand', (senderId, handRaised) => {
                setRaisedHands(prev => ({ ...prev, [senderId]: handRaised }));
                const name = userNames[senderId] || "Someone";
                if (handRaised) {
                    showToast(`${name} raised their hand ✋`, "info");
                }
            });

            socketRef.current.on('reaction', (senderId, emoji) => {
                addReactionLocally(emoji);
            });

            socketRef.current.on('screen-sharing', (senderId, data) => {
                const sharingUser = userNames[senderId] || data.username || "Participant";
                showToast(`${sharingUser} ${data.sharing ? "started" : "stopped"} screen sharing`);
            });
        })

        socketRef.current.on('disconnect', () => {
            setConnectionStatus("Disconnected");
        });
    }

    const silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    const handleVideo = () => {
        const nextState = !video;
        setVideo(nextState);
        if (window.localStream) {
            window.localStream.getVideoTracks().forEach(track => track.enabled = nextState);
        }
    }
    const handleAudio = () => {
        const nextState = !audio;
        setAudio(nextState);
        if (window.localStream) {
            window.localStream.getAudioTracks().forEach(track => track.enabled = nextState);
        }
    }

    const addReactionLocally = (emoji) => {
        const newReaction = {
            id: Math.random().toString(36).substr(2, 9),
            emoji,
            leftPosition: Math.floor(Math.random() * 160) + 20
        };
        setReactions(prev => [...prev, newReaction]);
        setTimeout(() => {
            setReactions(prev => prev.filter(r => r.id !== newReaction.id));
        }, 2500);
    };

    const sendReaction = (emoji) => {
        addReactionLocally(emoji);
        if (socketRef.current) {
            socketRef.current.emit('reaction', { emoji });
        }
    };

    const handleRaiseHand = () => {
        const nextState = !localHandRaised;
        setLocalHandRaised(nextState);
        localHandRaisedRef.current = nextState;
        if (socketRef.current) {
            socketRef.current.emit('raise-hand', { handRaised: nextState });
        }
    };

    const stopScreenSharing = async () => {
        setScreen(false);
        screenRef.current = false;

        if (socketRef.current) {
            socketRef.current.emit('screen-sharing', { username, sharing: false });
        }

        const prevVideo = prevVideoStateRef.current;
        setVideo(prevVideo);

        try {
            let cameraTrack;
            if (prevVideo && videoAvailable) {
                const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                cameraTrack = cameraStream.getVideoTracks()[0];
            } else {
                cameraTrack = black();
            }

            cameraTrack.enabled = prevVideo;

            // Replace screen track with camera track on all senders
            for (let id in connections) {
                if (id === socketIdRef.current) continue;
                const senders = connections[id].getSenders();
                const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(cameraTrack).catch(e => console.warn(e));
                }
            }

            // Swap in window.localStream and keep audio track intact
            const currentAudioTracks = window.localStream ? window.localStream.getAudioTracks() : [];
            
            // Stop current screen video track if it exists
            const currentVideoTracks = window.localStream ? window.localStream.getVideoTracks() : [];
            currentVideoTracks.forEach(t => t.stop());

            const newLocalStream = new MediaStream([cameraTrack, ...currentAudioTracks]);
            window.localStream = newLocalStream;

            if (localVideoref.current) {
                localVideoref.current.srcObject = newLocalStream;
            }
        } catch (e) {
            console.log("Error reverting to camera stream:", e);
        }
    };

    const handleScreen = async () => {
        if (!screen) {
            try {
                const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                setScreen(true);
                screenRef.current = true;

                prevVideoStateRef.current = video;
                setVideo(true);

                const screenTrack = stream.getVideoTracks()[0];
                screenTrack.enabled = true;

                // Replace on all senders
                for (let id in connections) {
                    if (id === socketIdRef.current) continue;
                    const senders = connections[id].getSenders();
                    const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
                    if (videoSender) {
                        videoSender.replaceTrack(screenTrack).catch(e => console.warn(e));
                    }
                }

                // Stop current camera video track
                const currentVideoTracks = window.localStream ? window.localStream.getVideoTracks() : [];
                currentVideoTracks.forEach(t => t.stop());

                // Swap in window.localStream keeping audio tracks intact
                const currentAudioTracks = window.localStream ? window.localStream.getAudioTracks() : [];
                const newLocalStream = new MediaStream([screenTrack, ...currentAudioTracks]);
                window.localStream = newLocalStream;

                if (localVideoref.current) {
                    localVideoref.current.srcObject = newLocalStream;
                }

                if (socketRef.current) {
                    socketRef.current.emit('screen-sharing', { username, sharing: true });
                }

                if (screenTrack) {
                    screenTrack.onended = () => {
                        stopScreenSharing();
                    };
                }
            } catch (e) {
                console.log("Error starting screen share:", e);
                setScreen(false);
                screenRef.current = false;
            }
        } else {
            stopScreenSharing();
        }
    };

    const handleEndCall = () => {
        setLeaveDialogOpen(true);
    }

    const confirmLeave = () => {
        try {
            let tracks = localVideoref.current.srcObject.getTracks()
            tracks.forEach(track => track.stop())
        } catch (e) { }
        window.location.href = "/home"
    };

    const handleKickUser = (socketId) => {
        if (socketRef.current) {
            socketRef.current.emit('kick-user', { socketId, path: window.location.href });
        }
    };

    const handleMessageChange = (e) => {
        setMessage(e.target.value);
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username)
        setMessage("");
    }

    const handleWaitingRoomAction = (socketId, action) => {
        if (socketRef.current) {
            socketRef.current.emit('waiting-room-action', { 
                socketId, 
                action, 
                path: window.location.href 
            });
        }
    };

    const togglePin = (socketId) => {
        setPinnedId(prev => (prev === socketId ? null : socketId));
    };

    const toggleVideoFullscreen = (elementId) => {
        const el = document.getElementById(elementId);
        if (el) {
            if (!document.fullscreenElement) {
                el.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        }
    };

    const handleToggleRecording = () => {
        const nextState = !isRecording;
        setIsRecording(nextState);
        showToast(nextState ? "Recording started" : "Recording stopped", "warning");
    };

    const connect = () => {
        if (!username.trim()) {
            showToast("Username cannot be empty", "warning");
            return;
        }
        setAskForUsername(false);
        connectToSocketServer();
    }

    const formatTimer = (seconds) => {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const getLayoutClassName = () => {
        const count = videos.length + 1;
        if (pinnedId) return styles.pinnedGrid;
        if (count <= 1) return styles.singleVideoLayout;
        if (count <= 2) return styles.dualVideoLayout;
        if (count <= 4) return styles.quadVideoLayout;
        return styles.multiVideoLayout;
    };

    const filteredVideos = videos.filter(v => {
        const name = userNames[v.socketId] || "";
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', position: 'relative' }}>
            {askForUsername === true ? (
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    minHeight: '100vh',
                    p: 3,
                    bgcolor: 'background.default'
                }}>
                    <Card sx={{ p: 4, width: '100%', maxWidth: 450, borderRadius: 3, boxShadow: 3, textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                            Lobby - Join Call
                        </Typography>
                        <TextField 
                            id="outlined-basic" 
                            label="Your Name / Alias" 
                            value={username} 
                            onChange={e => setUsername(e.target.value)} 
                            variant="outlined" 
                            fullWidth
                            sx={{ mb: 3 }}
                        />
                        <Button variant="contained" size="large" onClick={connect} fullWidth sx={{ mb: 4 }}>
                            Enter Room
                        </Button>
                        <Box sx={{ 
                            width: '100%', 
                            height: 200, 
                            bgcolor: '#1E1E24', 
                            borderRadius: 2, 
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <video 
                                ref={localVideoref} 
                                autoPlay 
                                muted 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {!video && (
                                <Box sx={{ position: 'absolute', color: 'white' }}>
                                    <VideocamOffIcon sx={{ fontSize: 40 }} />
                                </Box>
                            )}
                        </Box>
                    </Card>
                </Box>
            ) : waitingRoomState === "waiting" ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                    <CircularProgress size={60} sx={{ mb: 3 }} />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
                        Waiting Room
                    </Typography>
                    <Typography color="text.secondary">
                        Please wait. The meeting host will let you in shortly...
                    </Typography>
                </Box>
            ) : waitingRoomState === "rejected" ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 3 }}>
                    <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: 450 }}>
                        The host declined your request to join this meeting room.
                    </Alert>
                    <Button variant="contained" onClick={() => window.location.href = "/home"}>
                        Back to Dashboard
                    </Button>
                </Box>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {/* Top Stats Bar */}
                    <Box sx={{ 
                        position: 'absolute', 
                        top: 15, 
                        left: 20, 
                        zIndex: 50, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2.5,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        px: 2,
                        py: 0.8,
                        borderRadius: 3,
                        color: 'white'
                    }}>
                        <Typography sx={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span style={{ 
                                display: 'inline-block', 
                                width: 8, 
                                height: 8, 
                                borderRadius: '50%', 
                                bgcolor: connectionStatus === "Connected" ? '#4caf50' : '#ff9800' 
                            }} />
                            {connectionStatus}
                        </Typography>
                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                        <Typography sx={{ fontSize: '14px', fontFamily: 'monospace' }}>
                            {formatTimer(elapsedTime)}
                        </Typography>
                        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                        <Typography sx={{ fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                            Room: {window.location.pathname.substring(1)}
                            <IconButton 
                                size="small" 
                                color="inherit" 
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    showToast("Meeting invitation link copied to clipboard!", "success");
                                }}
                                title="Copy Invitation Link"
                                sx={{ p: 0.5 }}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Typography>
                    </Box>

                    {/* Flashing Recording Indicator */}
                    {isRecording && (
                        <Box sx={{ 
                            position: 'absolute', 
                            top: 15, 
                            right: 20, 
                            zIndex: 50, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            bgcolor: 'rgba(0,0,0,0.6)',
                            px: 2,
                            py: 0.8,
                            borderRadius: 3,
                            color: 'white'
                        }}>
                            <FiberManualRecordIcon color="error" sx={{ animation: 'pulse 1.2s infinite' }} />
                            <Typography sx={{ fontSize: '13px', fontWeight: 'bold' }}>REC</Typography>
                        </Box>
                    )}

                    {/* Chat Drawer */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatContainer}>
                                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Chat</Typography>
                                    <IconButton onClick={() => setModal(false)}><CloseIcon /></IconButton>
                                </Box>

                                <div className={styles.chattingDisplay}>
                                    {messages.length !== 0 ? messages.map((item, index) => (
                                        <Box key={index} sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: 'background.default', maxWidth: '85%' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, gap: 2 }}>
                                                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                    {item.sender}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.timestamp}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" color="text.primary">{item.data}</Typography>
                                        </Box>
                                    )) : (
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                            <Typography color="text.secondary">No messages yet</Typography>
                                        </Box>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                <div className={styles.chattingArea} style={{ display: 'flex', gap: 1, p: 2, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', width: '100%' }}>
                                    <TextField 
                                        value={message} 
                                        onChange={handleMessageChange} 
                                        placeholder="Send a message..." 
                                        variant="outlined" 
                                        size="small"
                                        fullWidth
                                        onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
                                    />
                                    <Button variant='contained' onClick={sendMessage}>Send</Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Participants Drawer */}
                    <Drawer 
                        anchor="right" 
                        open={showParticipants} 
                        onClose={() => setShowParticipants(false)}
                        PaperProps={{ sx: { width: 350, p: 2 } }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Roster ({videos.length + 1})</Typography>
                            <IconButton onClick={() => setShowParticipants(false)}><CloseIcon /></IconButton>
                        </Box>
                        
                        <TextField 
                            placeholder="Search user..." 
                            size="small" 
                            fullWidth 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            sx={{ mb: 2 }}
                        />

                        {/* Host controls waiting room list */}
                        {isHost && waitingList.length > 0 && (
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                                    Waiting Admission ({waitingList.length})
                                </Typography>
                                <List>
                                    {waitingList.map((user, i) => (
                                        <ListItem key={i} sx={{ bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 2, mb: 1 }}>
                                            <ListItemText primary={user.username} />
                                            <ListItemSecondaryAction>
                                                <IconButton color="success" size="small" onClick={() => handleWaitingRoomAction(user.socketId, 'admit')}>
                                                    <CheckIcon />
                                                </IconButton>
                                                <IconButton color="error" size="small" onClick={() => handleWaitingRoomAction(user.socketId, 'reject')}>
                                                    <CloseIcon />
                                                </IconButton>
                                            </ListItemSecondaryAction>
                                        </ListItem>
                                    ))}
                                </List>
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}

                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Participants</Typography>
                        <List>
                            {/* Local client */}
                            <ListItem sx={{ borderRadius: 2, bgcolor: activeSpeakerId === "local" ? 'rgba(14,113,235,0.1)' : 'transparent' }}>
                                <ListItemText 
                                    primary={`${username} (You)`} 
                                    secondary={isHost ? "Host" : ""} 
                                />
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    {localHandRaised && <span style={{ fontSize: '18px' }}>✋</span>}
                                    {audio ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" color="error" />}
                                    {video ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" color="error" />}
                                </Box>
                            </ListItem>
                            
                            {/* Remote clients */}
                            {filteredVideos.map((item, i) => (
                                <ListItem key={i} sx={{ borderRadius: 2, bgcolor: activeSpeakerId === item.socketId ? 'rgba(14,113,235,0.1)' : 'transparent' }}>
                                    <ListItemText 
                                        primary={userNames[item.socketId] || "Participant"} 
                                        secondary={i === 0 && !isHost ? "Host" : ""} 
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        {raisedHands[item.socketId] && <span style={{ fontSize: '18px' }}>✋</span>}
                                        {audioAnalysersRef.current[item.socketId] ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" color="error" />}
                                        
                                        {isHost && (
                                            <IconButton 
                                                size="small" 
                                                color="error" 
                                                onClick={() => handleKickUser(item.socketId)}
                                                title="Kick Participant"
                                            >
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </Drawer>

                    {/* Floating Reaction Animation */}
                    <div className={styles.reactionsContainer}>
                        {reactions.map(r => (
                            <div
                                key={r.id}
                                className={styles.floatingReaction}
                                style={{ left: `${r.leftPosition}px` }}
                            >
                                {r.emoji}
                            </div>
                        ))}
                    </div>

                    {/* Emoji Select Overlay */}
                    {showEmojiTray && (
                        <div style={{
                            position: "absolute",
                            bottom: "85px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            backgroundColor: "rgba(0, 0, 0, 0.85)",
                            padding: "10px 22px",
                            borderRadius: "30px",
                            display: "flex",
                            gap: "18px",
                            zIndex: 200,
                            boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.4)"
                        }}>
                            {["👍", "❤️", "😂", "👏", "😮", "🎉"].map(emoji => (
                                <span
                                    key={emoji}
                                    onClick={() => {
                                        sendReaction(emoji);
                                        setShowEmojiTray(false);
                                    }}
                                    style={{
                                        fontSize: "30px",
                                        cursor: "pointer",
                                        transition: "transform 0.15s ease"
                                    }}
                                    onMouseEnter={(e) => e.target.style.transform = "scale(1.4)"}
                                    onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                                >
                                    {emoji}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Buttons Row */}
                    <div className={styles.buttonContainers} style={{ zIndex: 120 }}>
                        <IconButton onClick={handleVideo} sx={{ color: video ? "white" : "red" }}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        <IconButton onClick={handleAudio} sx={{ color: audio ? "white" : "red" }}>
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable && (
                            <IconButton onClick={handleScreen} sx={{ color: screen ? "primary.main" : "white" }}>
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}

                        <IconButton onClick={handleRaiseHand} sx={{ color: localHandRaised ? "gold" : "white" }}>
                            <PanToolIcon />
                        </IconButton>

                        <IconButton onClick={() => setShowEmojiTray(!showEmojiTray)} sx={{ color: "white" }}>
                            <InsertEmoticonIcon />
                        </IconButton>

                        <IconButton onClick={handleToggleRecording} sx={{ color: isRecording ? "error.main" : "white" }}>
                            <FiberManualRecordIcon />
                        </IconButton>

                        <IconButton onClick={() => setShowParticipants(!showParticipants)} sx={{ color: "white" }}>
                            <PeopleIcon />
                        </IconButton>

                        <Badge badgeContent={newMessages} max={999} color='error'>
                            <IconButton onClick={() => { setModal(!showModal); setNewMessages(0); }} sx={{ color: "white" }}>
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                        <IconButton onClick={handleEndCall} sx={{ color: "red", ml: 2 }}>
                            <CallEndIcon />
                        </IconButton>
                    </div>

                    {/* Video grid area */}
                    <div className={getLayoutClassName()} style={{ width: '100%', height: 'calc(100vh - 100px)', padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                        
                        {/* Pinned View Mode */}
                        {pinnedId ? (
                            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {/* Large Pinned element */}
                                <Box sx={{ flexGrow: 1, position: 'relative', bgcolor: '#1E1E24', borderRadius: 3, overflow: 'hidden', border: activeSpeakerId === pinnedId ? '3px solid #0E71EB' : '0px' }}>
                                    {pinnedId === "local" ? (
                                        <video 
                                            ref={localVideoref} 
                                            autoPlay 
                                            muted 
                                            id="video-local-main"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <video
                                            id={`video-${pinnedId}-main`}
                                            ref={ref => {
                                                const v = videos.find(v => v.socketId === pinnedId);
                                                if (ref && v && v.stream) ref.srcObject = v.stream;
                                            }}
                                            autoPlay
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    )}
                                    <Box sx={{ position: 'absolute', bottom: 15, left: 20, zIndex: 10, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 2, py: 0.6, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2">
                                            {pinnedId === "local" ? `${username} (You)` : (userNames[pinnedId] || "Participant")}
                                        </Typography>
                                        {raisedHands[pinnedId] && <span style={{ fontSize: '16px' }}>✋</span>}
                                    </Box>
                                    <Box sx={{ position: 'absolute', top: 15, right: 20, display: 'flex', gap: 1 }}>
                                        <IconButton size="small" onClick={() => togglePin(pinnedId)} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                                            <PinDropIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => toggleVideoFullscreen(pinnedId === "local" ? "video-local-main" : `video-${pinnedId}-main`)} sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white' }}>
                                            <FullscreenIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>

                                {/* List of other thumbnails below */}
                                <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', py: 1, minHeight: '130px' }}>
                                    {/* Local client thumbnail if not pinned */}
                                    {pinnedId !== "local" && (
                                        <Card sx={{ width: 180, height: 110, position: 'relative', bgcolor: '#1E1E24', flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>
                                            <video 
                                                ref={localVideoref} 
                                                autoPlay 
                                                muted 
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                            <Box sx={{ position: 'absolute', bottom: 5, left: 10, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', px: 1, py: 0.2, borderRadius: 1 }}>
                                                <Typography variant="caption">{username} (You)</Typography>
                                            </Box>
                                            <IconButton size="small" onClick={() => togglePin("local")} sx={{ position: 'absolute', top: 5, right: 5, color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                                <PinDropIcon fontSize="inherit" />
                                            </IconButton>
                                        </Card>
                                    )}

                                    {/* Remote thumbnails */}
                                    {videos.map((video) => (
                                        pinnedId !== video.socketId && (
                                            <Card key={video.socketId} sx={{ width: 180, height: 110, position: 'relative', bgcolor: '#1E1E24', flexShrink: 0, borderRadius: 2, overflow: 'hidden' }}>
                                                <video
                                                    ref={ref => { if (ref && video.stream) ref.srcObject = video.stream; }}
                                                    autoPlay
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                                <Box sx={{ position: 'absolute', bottom: 5, left: 10, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', px: 1, py: 0.2, borderRadius: 1 }}>
                                                    <Typography variant="caption">{userNames[video.socketId] || "Participant"}</Typography>
                                                </Box>
                                                <IconButton size="small" onClick={() => togglePin(video.socketId)} sx={{ position: 'absolute', top: 5, right: 5, color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                                    <PinDropIcon fontSize="inherit" />
                                                </IconButton>
                                            </Card>
                                        )
                                    ))}
                                </Box>
                            </Box>
                        ) : (
                            /* Equal Grid View Mode */
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', width: '100%', height: '100%' }}>
                                {/* Local camera grid card */}
                                <Card sx={{ 
                                    width: videos.length === 0 ? '100%' : '45%', 
                                    height: videos.length === 0 ? '100%' : '45%', 
                                    maxHeight: '100%',
                                    position: 'relative', 
                                    bgcolor: '#1E1E24',
                                    border: activeSpeakerId === "local" ? '3px solid #0E71EB' : '0px',
                                    boxShadow: activeSpeakerId === "local" ? '0px 0px 15px rgba(14,113,235,0.7)' : 'none',
                                    borderRadius: 3,
                                    overflow: 'hidden'
                                }}>
                                    <video 
                                        ref={localVideoref} 
                                        autoPlay 
                                        muted 
                                        id="video-local-grid"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <Box sx={{ position: 'absolute', bottom: 15, left: 20, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 2, py: 0.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2">{username} (You)</Typography>
                                        {localHandRaised && <span style={{ fontSize: '16px' }}>✋</span>}
                                    </Box>
                                    <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
                                        <IconButton size="small" onClick={() => togglePin("local")} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                            <PinDropIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" onClick={() => toggleVideoFullscreen("video-local-grid")} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                            <FullscreenIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Card>

                                {/* Remote camera cards */}
                                {videos.map((video) => (
                                    <Card key={video.socketId} sx={{ 
                                        width: '45%', 
                                        height: '45%', 
                                        position: 'relative', 
                                        bgcolor: '#1E1E24',
                                        border: activeSpeakerId === video.socketId ? '3px solid #0E71EB' : '0px',
                                        boxShadow: activeSpeakerId === video.socketId ? '0px 0px 15px rgba(14,113,235,0.7)' : 'none',
                                        borderRadius: 3,
                                        overflow: 'hidden'
                                    }}>
                                        <video
                                            id={`video-${video.socketId}-grid`}
                                            ref={ref => { if (ref && video.stream) ref.srcObject = video.stream; }}
                                            autoPlay
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <Box sx={{ position: 'absolute', bottom: 15, left: 20, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', px: 2, py: 0.5, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2">{userNames[video.socketId] || "Participant"}</Typography>
                                            {raisedHands[video.socketId] && <span style={{ fontSize: '16px' }}>✋</span>}
                                        </Box>
                                        <Box sx={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 1 }}>
                                            <IconButton size="small" onClick={() => togglePin(video.socketId)} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                                <PinDropIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => toggleVideoFullscreen(`video-${video.socketId}-grid`)} sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.4)' }}>
                                                <FullscreenIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    </Card>
                                ))}
                            </Box>
                        )}
                    </div>
                </div>
            )}

            {/* Leave Call Confirmation */}
            <Dialog
                open={leaveDialogOpen}
                onClose={() => setLeaveDialogOpen(false)}
            >
                <DialogTitle sx={{ fontWeight: 'bold' }}>{"Leave Meeting?"}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to end your connection and leave this meeting?
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                    <Button onClick={() => setLeaveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmLeave} variant="contained" color="error" autoFocus>
                        Leave Call
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast Alerts */}
            <Snackbar
                open={!!notification}
                autoHideDuration={3000}
                onClose={() => setNotification("")}
            >
                <Alert severity={toastSeverity} sx={{ width: '100%' }}>
                    {notification}
                </Alert>
            </Snackbar>
        </Box>
    )
}
