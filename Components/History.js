import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert, Button } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import Icons from 'react-native-vector-icons/Ionicons';

import firestore from '@react-native-firebase/firestore';
import Tts from 'react-native-tts';
import auth from '@react-native-firebase/auth';


const History = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [historyList, setHistoryList] = useState([]);

    useEffect(() => {
        const user = auth().currentUser;

        if (!user) {
            console.warn('User not authenticated');
            setLoading(false);
            return;
        }

        const unsubscribe = firestore()
            .collection('userInput')
            .where('userId', '==', user.uid) // <-- Filter by userId
            .orderBy('createdAt', 'desc')
            .onSnapshot(
                snapshot => {
                    const data = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    }));
                    setHistoryList(data);
                    setLoading(false);
                },
                error => {
                    console.error('Error fetching data:', error);
                    setLoading(false);
                }
            );

        // TTS settings
        Tts.setDefaultLanguage('en-US');
        Tts.setDefaultRate(0.5);
        Tts.setDefaultPitch(0.7);

        return () => unsubscribe();
    }, []);

    const handlePlayPress = (inputText) => {
        navigation.navigate('Dashboard', { replayText: inputText });
    };


    const handleDelete = async (id) => {
        try {
            await firestore().collection('userInput').doc(id).delete();
            console.log('Deleted history with id:', id);
        } catch (error) {
            console.error('Error deleting history item:', error);
        }
    };

    const handleDeleteAll = () => {
        Alert.alert(
            'Delete All History',
            'Are you sure you want to delete all history entries?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const user = auth().currentUser;
                            const snapshot = await firestore()
                                .collection('userInput')
                                .where('userId', '==', user.uid)
                                .get();

                            const batch = firestore().batch();
                            snapshot.forEach(doc => {
                                batch.delete(doc.ref);
                            });

                            await batch.commit();
                            console.log('All history deleted.');
                        } catch (error) {
                            console.error('Error deleting all history:', error);
                        }
                    },
                },
            ]
        );
    };



    const handleSpeakerPress = (inputText) => {
        if (inputText) {
            Tts.speak(inputText); // Speak the input text
        } else {
            Tts.speak('No text available to speak.');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#22577A" />
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <>


            <View style={styles.container}>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity style={{ marginRight: 9 }} onPress={() => navigation.navigate('Dashboard')}>
                        <Icons name='arrow-back' size={24} color="#22577A" />
                    </TouchableOpacity>
                    <Text style={styles.text}>History</Text>
                </View>
                <TouchableOpacity style={styles.deleteAllButton} onPress={handleDeleteAll}>
                    <Text style={styles.deleteAllButtonText}>Delete All History</Text>
                </TouchableOpacity>
                {historyList.length === 0 ? (
                    <Text style={styles.noDataText}>No history found</Text>
                ) : (
                    <FlatList
                        data={historyList}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.itemContainer}>
                                <View style={styles.textContainer}>
                                    <Text style={styles.itemText}>{item.inputText || 'No Input Text Available'}</Text>
                                    {/* <Text style={styles.dateText}>{new Date(item.createdAt.seconds * 1000).toLocaleString()}</Text> */}
                                </View>
                                <View style={styles.iconContainer}>
                                    <TouchableOpacity onPress={() => handlePlayPress(item.inputText)}>
                                        <Icon name="play-circle" size={24} color="#22577A" style={styles.icon} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleSpeakerPress(item.inputText)}>
                                        <Icon name="volume-up" size={24} color="#22577A" style={styles.icon} />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => {
                                        Alert.alert(
                                            'Delete Entry',
                                            'Are you sure you want to delete this history entry?',
                                            [
                                                { text: 'Cancel', style: 'cancel' },
                                                { text: 'Delete', style: 'destructive', onPress: () => handleDelete(item.id) },
                                            ]
                                        );
                                    }}>
                                        <Icon name="trash" size={24} color="#d9534f" style={styles.icon} />
                                    </TouchableOpacity>
                                </View>

                            </View>

                        )}
                    />
                )}

            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    header: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        color: '#22577A',
    },
    itemContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    itemText: {
        fontSize: 16,
        color: '#333',
        fontFamily: 'Poppins-Regular',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
        fontFamily: 'Poppins-Regular',
    },
    iconContainer: {
        flexDirection: 'row',
    },
    icon: {
        marginLeft: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        marginTop: 20,
        fontFamily: 'Poppins-Regular',
    },

    deleteAllButton: {
        backgroundColor: '#d9534f',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    deleteAllButtonText: {
        color: '#fff',
        fontSize: 16,

        fontFamily: 'Poppins-SemiBold',
    },
    text: {
        fontFamily: 'Poppins-SemiBold',
        fontSize: 24,
        color: '#22577A',
    },

});

export default History;