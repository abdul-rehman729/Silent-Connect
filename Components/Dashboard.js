import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import AntDesign from 'react-native-vector-icons/AntDesign';
import firestore from '@react-native-firebase/firestore';
import Footer from './Footer';
import auth from '@react-native-firebase/auth';
import Video from 'react-native-video';
import Voice from '@react-native-voice/voice';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '../Firebase-Functions/AuthProvider';

const Dashboard = ({ navigation }) => {
  const [isTyping, setIsTyping] = useState(false);
  const [text, setText] = useState('');
  const { width, height } = Dimensions.get('window');
  const route = useRoute(); // Access route params

  const [videoList, setVideoList] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'SignIn' }] });
    }
  }, [user, navigation]);


  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setIsTyping(false);
  };

  const saveTextToFirestore = async () => {
    const user = auth().currentUser;

    if (!user) {
      console.warn('User not authenticated');
      return;
    }

    const textToSave = text.trim() !== '' ? text : recognizedText.trim();

    if (textToSave === '') {
      console.warn('Text field is empty!');
      return;
    }

    try {
      await firestore().collection('userInput').add({
        userId: user.uid,
        inputText: textToSave,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      console.log('Text saved to Firestore!');

      // Clear inputs
      setText('');
      setRecognizedText('');

      // Call API with correct text
      await callApiForVideos(textToSave);
    } catch (error) {
      console.error('Error saving text to Firestore:', error);
    }
  };


  const callApiForVideos = async (inputText) => {
    try {
      console.log('Calling API with text:', inputText); // ✅ Confirmation log

      const response = await fetch('http://192.168.187.12:3000/api/text-to-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sentence: inputText }),
      });

      const data = await response.json();

      console.log('API response received:', data); // ✅ Confirmation log
      if (data.videos && data.videos.length > 0) {
        setVideoList(data.videos);
        setCurrentIndex(0);
        setIsPlaying(true);
      } else {
        setVideoList([]);
        setIsPlaying(false);
      }

    } catch (error) {
      console.error('Error fetching videos:', error);
    }
  };

  useEffect(() => {
    Voice.onSpeechEnd = onSpeechEndHandler;
    Voice.onSpeechResults = onSpeechResultsHandler;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const onSpeechEndHandler = () => {
    setIsRecording(false);
  };

  const onSpeechResultsHandler = (e) => {
    console.log('Speech Results Event: ', e);
    if (e && e.value && e.value.length > 0) {
      const newVoiceText = e.value[0];
      setText(prevText => (prevText ? prevText + ' ' + newVoiceText : newVoiceText)); // add voice text to already typed text
    }


  };

  const startRecording = async () => {
    try {
      await Voice.start('en-US');
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting Voice Recognition: ', error);
    }
  };

  const stopRecording = async () => {
    try {
      await Voice.stop();
      setIsRecording(false);
    } catch (error) {
      console.error('Error stopping Voice Recognition: ', error);
    }
  };

  const handleMicPress = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  useEffect(() => {
    if (route.params?.replayText) {
      // setText(route.params.replayText);
      callApiForVideos(route.params.replayText);
    }
  }, [route.params?.replayText]);

  const handleTextChange = (text) => {
    setText(text);
    setIsTyping(true);
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={styles.container}>
        {/* Avatar or Video */}
        <View style={styles.avatarContainer}>
          {isPlaying && videoList.length > 0 ? (
            <Video
              source={{ uri: videoList[currentIndex] }}
              style={[styles.avatar, { opacity: isPlaying ? 1 : 0.4 }]}
              resizeMode="contain"
              onBuffer={() => console.log('⏳ Buffering...')}
              onLoad={() => console.log('✅ Video loaded')}
              onError={(e) => console.log('❌ Video error:', e)}
              onEnd={() => {
                if (currentIndex + 1 < videoList.length) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  setIsPlaying(false);
                }
              }}
              controls={false}
              repeat={false}
            />
          ) : (
            <Image
              style={styles.avatar}
              source={require('../assets/images/staticPose.png')}
              resizeMode="contain"
            />
          )}
        </View>

        {/* Input and Footer */}
        <View style={styles.bottomContainer}>
          <View
            style={[
              styles.inputContainer,
              { marginHorizontal: width * 0.05 },
            ]}
          >
            <TextInput
              style={styles.input}
              placeholder="Type to translate"
              placeholderTextColor="#888"
              onFocus={() => setIsTyping(true)}
              value={text || recognizedText} // Allow both manual text and voice-recognized text
              onChangeText={handleTextChange} // Allow manual text entry
            />
            {(text || recognizedText) && isTyping ? ( // Show send button if there is text
              <TouchableOpacity
                style={styles.sendButton}
                onPress={saveTextToFirestore}
              >
                <Ionicons name="send-sharp" size={25} color="#000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.microphone} onPress={handleMicPress}>
                <FontAwesome
                  name="microphone"
                  size={28}
                  color={isRecording ? 'red' : 'black'}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.camera}
              onPress={() => navigation.navigate('VideoRecorder')}
            >
              <AntDesign name="camera" size={28} color="#000" />
            </TouchableOpacity>
          </View>

          <Footer navigation={navigation} />
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 300,
    height: 300,
  },
  bottomContainer: {
    justifyContent: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginHorizontal: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Poppins-Regular',
  },
  sendButton: {
    marginLeft: 10,
  },
  microphone: {
    marginLeft: 10,
  },
  camera: {
    marginLeft: 10,
  },
});
