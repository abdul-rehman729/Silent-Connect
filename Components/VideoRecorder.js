import React, { useState, useEffect, useRef } from 'react';
import { View, Button, StyleSheet, Text, Alert, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import Icon from 'react-native-vector-icons/AntDesign';


const VideoRecorder = ({ navigation }) => {
    const cameraRef = useRef(null);

    const [isRecording, setIsRecording] = useState(false);
    const [cameraPermission, setCameraPermission] = useState(false);
    const [microphonePermission, setMicrophonePermission] = useState(false);
    const [showModal, setShowModal] = useState(true); // <-- Modal control

    const [loadingModalVisible, setLoadingModalVisible] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("Converting video to frames...");


    const [cameraPosition, setCameraPosition] = useState('back');
    const device = useCameraDevice(cameraPosition);

    const playLoadingSequence = async () => {
        setLoadingModalVisible(true);

        const messages = [
            "Converting video to frames...",
            "Detecting gestures...",
            "Structuring the sentence...",
            "On the way...",
            "Please wait..."
        ];

        for (let i = 0; i < messages.length; i++) {
            setLoadingMessage(messages[i]);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 1.5 sec delay
        }
    };

    useEffect(() => {
        const requestPermissions = async () => {
            const cameraStatus = await Camera.requestCameraPermission();
            const micStatus = await Camera.requestMicrophonePermission();
            setCameraPermission(cameraStatus === 'authorized');
            setMicrophonePermission(micStatus === 'authorized');
        };

        requestPermissions();
    }, []);

    const toggleCamera = () => {
        setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
    };


    const startRecording = async () => {
        if (cameraRef.current) {
            try {
                setIsRecording(true);
                await cameraRef.current.startRecording({
                    fileType: 'mp4',
                    onRecordingFinished: async (video) => {
                        console.log('Recording finished: ', video.path);
                        setIsRecording(false);
                        try {
                            const data = new FormData();
                            data.append('video', {
                                uri: `file://${video.path}`,
                                type: 'video/mp4',
                                name: 'sign.mp4',
                            });
                            setLoadingModalVisible(true); // 🟢 Trigger loader first
                            setTimeout(async () => {
                                await playLoadingSequence(); // ⏳ Now start step-by-step message

                                const response = await fetch('http://192.168.187.12:3000/api/sign-to-text/predict', {
                                    method: 'POST',
                                    body: data,
                                    headers: {
                                        'Content-Type': 'multipart/form-data',
                                    },
                                });

                                const json = await response.json();
                                console.log('Server response:', json);

                                setLoadingModalVisible(false); // Hide modal
                                navigation.navigate('TextGenerated', { translatedText: json.processedText, unrecognizedGestures: json.unrecognizedCount, processingTime: json.processingTime });

                            }, 100); // 🔄 Let React show modal first


                        } catch (error) {
                            console.error('Error uploading video:', error);
                            Alert.alert('Error', 'Failed to send video to server.');
                        }
                    },
                    onRecordingError: (error) => {
                        console.error('Recording error: ', error);
                        setIsRecording(false);
                    },
                });
            } catch (error) {
                console.error('Error starting recording: ', error);
                setIsRecording(false);
            }
        }
    };

    const stopRecording = () => {
        if (cameraRef.current) {
            cameraRef.current.stopRecording();
        }
        navigation.navigate('Dashboard');
    };

    if (!device) {
        return (
            <View style={styles.container}>
                <Text>Loading camera...</Text>
            </View>
        );
    }

    return (
        <>
            <Modal transparent={true} visible={loadingModalVisible} animationType="fade">
                <View style={styles.loaderModalBackground}>
                    <View style={styles.loaderModalContent}>
                        <ActivityIndicator size="large" color="#22577A" />
                        <Text style={styles.loadingMessage}>{loadingMessage}</Text>
                    </View>
                </View>
            </Modal>

            <View style={styles.container}>
                <Camera
                    ref={cameraRef}
                    style={StyleSheet.absoluteFill}
                    device={device}
                    isActive={true}
                    video={true}
                    photo={true}
                    videoStabilizationMode="standard"
                />

                {/* Instruction Modal */}
                <Modal visible={showModal} animationType="slide" transparent={true}>
                    <View style={styles.modalBackground}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Instructions</Text>
                            <Text style={styles.instruction}>• Please capture the video in good lighting.</Text>
                            <Text style={styles.instruction}>• Perform gestures at a moderate speed — not too slow, not too fast.</Text>
                            <Text style={styles.instruction}>• Make sure your hands are clearly visible in the frame.</Text>
                            <Text style={styles.instruction}>• Longer videos can take more time. Don't record the video more than 15 seconds</Text>

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
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    controls: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',

        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'rgba(0,0,0,0.6)',
        marginBottom: 10,
    },
    instruction: {
        fontSize: 16,
        marginVertical: 4,
        color: 'rgba(0,0,0,0.6)',
    },
    modalButton: {
        marginTop: 20,
        backgroundColor: '#007AFF',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
    },
    toggleCameraButtonStyle: {
        height: 50,
        width: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5, // for Android shadow
    },
    loaderModalBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    loaderModalContent: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 10,
        alignItems: 'center',
        elevation: 10,
    },
    loadingMessage: {
        marginTop: 16,
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },


});

export default VideoRecorder;
