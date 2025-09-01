import React, { useState, useEffect, useRef } from 'react';
import { View, Button, StyleSheet, Text, Alert, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/AntDesign';

const API_BASE = 'http://192.168.43.12:3000'; // ⬅️ apna IP yahan rakho (space na ho)

export default function VideoRecorder({ navigation }) {
    const cameraRef = useRef(null);
    const mountedRef = useRef(true);
    const statusTimerRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(false);
    const [microphonePermission, setMicrophonePermission] = useState(false);
    const [showModal, setShowModal] = useState(true);

    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Preparing...');

    const [cameraPosition, setCameraPosition] = useState('back');
    const device = useCameraDevice(cameraPosition);

    // Keep AbortController in ref so we can cancel from "Cancel" button
    const abortRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        (async () => {
            const cam = await Camera.requestCameraPermission();
            const mic = await Camera.requestMicrophonePermission();
            setCameraPermission(cam === 'authorized');
            setMicrophonePermission(mic === 'authorized');
        })();
        return () => {
            mountedRef.current = false;
            if (abortRef.current) abortRef.current.abort();
            if (statusTimerRef.current) clearInterval(statusTimerRef.current);
        };
    }, []);

    const toggleCamera = () => {
        setCameraPosition(prev => (prev === 'back' ? 'front' : 'back'));
    };

    // rotate status messages while request runs
    const startStatusMarquee = () => {
        const messages = [
            'Uploading video...',
            'Converting video to frames...',
            'Detecting gestures...',
            'Structuring sentence...',
            'Almost there...'
        ];
        let i = 0;
        setLoadingMessage(messages[0]);
        statusTimerRef.current = setInterval(() => {
            i = (i + 1) % messages.length;
            setLoadingMessage(messages[i]);
        }, 3000);
    };

    const stopStatusMarquee = () => {
        if (statusTimerRef.current) clearInterval(statusTimerRef.current);
        statusTimerRef.current = null;
    };

    const withTimeout = (promise, ms, controller) => {
        return new Promise((resolve, reject) => {
            const t = setTimeout(() => {
                controller?.abort?.();
                reject(new Error('Request timed out'));
            }, ms);
            promise
                .then((v) => { clearTimeout(t); resolve(v); })
                .catch((e) => { clearTimeout(t); reject(e); });
        });
    };

    const uploadVideo = async (videoPath) => {
        const controller = new AbortController();
        abortRef.current = controller;

        const data = new FormData();
        data.append('video', {
            uri: `file://${videoPath}`,
            type: 'video/mp4',
            name: 'sign.mp4',
        });

        setLoadingModalVisible(true);
        startStatusMarquee();

        try {
            const res = await withTimeout(
                fetch(`${API_BASE}/api/sign-to-text/predict`, {
                    method: 'POST',
                    body: data,
                    headers: { 'Content-Type': 'multipart/form-data' },
                    signal: controller.signal,
                }),
                120000, // ⏱️ 45s timeout — adjust as needed
                controller
            );

            if (!res.ok) {
                const text = await res.text().catch(() => '');
                throw new Error(`Server error: ${res.status} ${text}`);
            }

            const json = await res.json();
            if (!json?.success) {
                throw new Error(json?.error || 'Unknown server error');
            }

            // success → navigate
            if (!mountedRef.current) return;
            navigation.navigate('TextGenerated', {
                translatedText: json.processedText,
                unrecognizedGestures: json.unrecognizedCount,
                processingTime: json.processingTime,
            });
        } catch (err) {
            if (!mountedRef.current) return;
            const isAbort = err?.name === 'AbortError';
            Alert.alert(isAbort ? 'Cancelled' : 'Error', isAbort ? 'Upload cancelled.' : (err.message || 'Failed to send video.'));
        } finally {
            stopStatusMarquee();
            abortRef.current = null;
            if (mountedRef.current) setLoadingModalVisible(false);
        }
    };

    const startRecording = async () => {
        if (!cameraRef.current) return;
        try {
            setIsRecording(true);
            await cameraRef.current.startRecording({
                fileType: 'mp4',
                onRecordingFinished: async (video) => {
                    setIsRecording(false);
                    // start upload immediately (no artificial 25s wait)
                    uploadVideo(video.path);
                },
                onRecordingError: (error) => {
                    setIsRecording(false);
                    Alert.alert('Recording error', error?.message || 'Failed to record.');
                },
            });
        } catch (error) {
            setIsRecording(false);
            Alert.alert('Error', error?.message || 'Could not start recording.');
        }
    };

    const stopRecording = () => {
        cameraRef.current?.stopRecording();
        // optional: navigate back after stop (I’d keep user here until upload flows)
        // navigation.navigate('Dashboard');
    };

    const cancelInFlight = () => {
        if (abortRef.current) abortRef.current.abort();
        stopStatusMarquee();
        setLoadingModalVisible(false);
    };

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={{ color: 'white', padding: 20 }}>Waiting for camera/microphone permissions…</Text>
            </View>
        );
    }

    return (
        <>
            <Modal transparent visible={loadingModalVisible} animationType="fade">
                <View style={styles.loaderModalBackground}>
                    <View style={styles.loaderModalContent}>
                        <ActivityIndicator size="large" color="#22577A" />
                        <Text style={styles.loadingMessage}>{loadingMessage}</Text>
                        <TouchableOpacity onPress={cancelInFlight} style={styles.cancelBtn}>
                            <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <View style={styles.container}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive
                    video
                    photo
                    videoStabilizationMode="standard"
                />

                {/* Instruction Modal */}
                <Modal visible={showModal} animationType="slide" transparent>
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Instructions</Text>
                            <Text style={styles.instruction}>• Good lighting.</Text>
                            <Text style={styles.instruction}>• Moderate speed gestures.</Text>
                            <Text style={styles.instruction}>• Hands clearly visible.</Text>
                            <Text style={styles.instruction}>• Max 15 seconds clip.</Text>
                            <TouchableOpacity style={styles.modalButton} onPress={() => setShowModal(false)}>
                                <Text style={styles.buttonText}>Got It</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                <View style={styles.controls}>
                    {!isRecording ? (
                        <Button title="Start Recording" onPress={startRecording} />
                    ) : (
                        <Button title="Stop Recording" onPress={stopRecording} />
                    )}
                    <View style={styles.toggleCameraButtonStyle}>
                        <Icon name="retweet" size={24} color="rgba(0,0,0,0.6)" onPress={toggleCamera} />
                    </View>
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    controls: {
        position: 'absolute', bottom: 20, flexDirection: 'row',
        justifyContent: 'space-around', width: '100%',
    },
    modalBackground: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
    },
    modalContent: {
        width: '85%', backgroundColor: 'white', padding: 20, borderRadius: 10, elevation: 5,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'rgba(0,0,0,0.6)', marginBottom: 10 },
    instruction: { fontSize: 16, marginVertical: 4, color: 'rgba(0,0,0,0.6)' },
    modalButton: {
        marginTop: 20, backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    },
    buttonText: { color: 'white', fontSize: 16 },
    toggleCameraButtonStyle: {
        height: 50, width: 50, borderRadius: 25, backgroundColor: 'white',
        justifyContent: 'center', alignItems: 'center', marginLeft: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 5,
    },
    loaderModalBackground: {
        flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)',
    },
    loaderModalContent: {
        backgroundColor: 'white', padding: 24, borderRadius: 10, alignItems: 'center', elevation: 10, minWidth: '70%',
    },
    loadingMessage: { marginTop: 16, fontSize: 16, color: '#333', textAlign: 'center' },
    cancelBtn: {
        marginTop: 16, backgroundColor: '#d9534f', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8,
    },
});
