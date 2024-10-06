import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  Text,
  TouchableOpacity,
  Alert,
  View,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Button,
} from 'react-native';
import Zeroconf from 'react-native-zeroconf';
import { AndroidRemote, RemoteKeyCode, RemoteDirection } from './src/atv-module';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
global.process = require('process');

const App = () => {
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string>('');
  const [pairingModalVisible, setPairingModalVisible] = useState(false);
  const [remote, setRemote] = useState<any>(null);
  const [paired, setPaired] = useState(false);

  const zeroconf = useMemo(() => new Zeroconf(), []);

  const scanForDevices = useCallback(() => {
    setScanning(true);
    setDevices([]); // Clear previous devices

    zeroconf.scan('androidtvremote2', 'tcp', 'local.');

    zeroconf.on('resolved', (device: any) => {
      console.log('Discovered device:', device);

      setDevices((prevDevices) => {
        // Avoid adding duplicate devices by checking name and address
        if (!prevDevices.some((d) => d.name === device.name && d.addresses[0] === device.addresses[0])) {
          return [...prevDevices, device];
        }
        return prevDevices;
      });
    });

    zeroconf.on('error', (error: any) => {
      console.error('Zeroconf Error:', error);
      setError(error.toString());
      setScanning(false); // Stop scanning on error
    });

    zeroconf.on('stop', () => {
      setScanning(false); // Stop scanning when done
    });

    setTimeout(() => {
      zeroconf.stop(); // Stop scanning after a fixed duration (e.g., 10 seconds)
    }, 3000);
  }, [zeroconf]);

  useEffect(() => {
    scanForDevices();

    return () => {
      zeroconf.stop();
      zeroconf.removeDeviceListeners();
    };
  }, [scanForDevices, zeroconf]);

  const handleDeviceSelection = async (device: any) => {
    setSelectedDevice(device); // Set the selected device for display
    setScanning(false); // Stop scanning when a device is selected

    const remoteOptions = {
      pairing_port: 6467,
      remote_port: 6466,
      name: 'androidtv-remote',
      cert: {}, // For reusing existing certificate
    };

    const androidRemote = new AndroidRemote(device.addresses[0], remoteOptions);

    androidRemote.on('secret', () => {
      setPairingModalVisible(true); // Show the modal to input the pairing code
    });

    androidRemote.on('powered', (powered: boolean) => {
      console.debug('Powered:', powered);
    });

    androidRemote.on('volume', (volume: any) => {
      console.debug('Volume:', volume.level + '/' + volume.maximum + ' | Muted:', volume.muted);
    });

    androidRemote.on('current_app', (currentApp: string) => {
      console.debug('Current App:', currentApp);
    });

    androidRemote.on('ready', () => {
      console.log('Remote is ready');
      setPaired(true); // Mark the pairing as complete
    });

    try {
      let started = await androidRemote.start();
      if (started) {
        setRemote(androidRemote);
        Alert.alert('Success', `Connected to ${device.name}`);
      } else {
        Alert.alert('Error', 'Failed to start remote session');
      }
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Error', 'Could not connect to the Android TV');
    }
  };

  const handlePairingCodeSubmit = () => {
    if (remote && pairingCode) {
      remote.sendCode(pairingCode);
      setPairingModalVisible(false); // Hide the modal after submitting the code
    } else {
      Alert.alert('Error', 'Please enter a valid pairing code');
    }
  };

  const sendRemoteCommand = (keyCode: number, direction = RemoteDirection.SHORT) => {
    if (!remote || !paired) {
      Alert.alert('Error', 'TV is not connected or paired.');
      return;
    }

    remote.sendKey(keyCode, direction);
  };

  const rescanDevices = () => {
    // Reset the states
    setSelectedDevice(null);
    setPaired(false);
    setRemote(null);
    // Initiate scanning again
    scanForDevices();
  };

  return (
    <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold' }}>Android TV Remote Control</Text>

      {error && <Text style={{ color: 'red' }}>Error: {error}</Text>}

      {scanning ? (
        <View>
          <Text style={{ marginVertical: 10 }}>Scanning for Android TVs...</Text>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : !selectedDevice ? (
        <View>
          {devices.length === 0 ? (
            <Text>No devices found. Try again later.</Text>
          ) : (
            <FlatList
              data={devices}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleDeviceSelection(item)}
                  style={{ padding: 10, backgroundColor: 'lightblue', marginVertical: 5 }}>
                  <Text style={{ color: 'black' }}>{item.name} ({item.addresses[0]})</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : (
        <View style={{ marginVertical: 20 }}>
          <Text style={{ marginBottom: 10 }}>Connected to {selectedDevice.name}</Text>
          
          {/* Add a button to rescan devices */}
          <TouchableOpacity
            onPress={rescanDevices}
            style={{ padding: 10, backgroundColor: 'red', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>Rescan for Devices</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendRemoteCommand(RemoteKeyCode.DPAD_UP)}
            style={{ padding: 10, backgroundColor: 'blue', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>D-Pad Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendRemoteCommand(RemoteKeyCode.DPAD_DOWN)}
            style={{ padding: 10, backgroundColor: 'blue', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>D-Pad Down</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendRemoteCommand(RemoteKeyCode.DPAD_LEFT)}
            style={{ padding: 10, backgroundColor: 'blue', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>D-Pad Left</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendRemoteCommand(RemoteKeyCode.DPAD_RIGHT)}
            style={{ padding: 10, backgroundColor: 'blue', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>D-Pad Right</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => sendRemoteCommand(RemoteKeyCode.ENTER)}
            style={{ padding: 10, backgroundColor: 'green', marginVertical: 5 }}>
            <Text style={{ color: 'white' }}>Select</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal for entering the pairing code */}
      <Modal visible={pairingModalVisible} animationType="slide" transparent={true}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}>
          <View
            style={{
              width: 300,
              padding: 20,
              backgroundColor: 'white',
              borderRadius: 10,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 18, marginBottom: 20 }}>Enter Pairing Code</Text>
            <TextInput
              style={{
                width: '100%',
                padding: 10,
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 5,
                marginBottom: 20,
                textAlign: 'center',
              }}
              keyboardType="number-pad"
              placeholder="Enter the code shown on TV"
              value={pairingCode}
              onChangeText={setPairingCode}
            />
            <Button title="Submit" onPress={handlePairingCodeSubmit} />
            <Button title="Cancel" onPress={() => setPairingModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default App;
