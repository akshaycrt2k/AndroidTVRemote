import protobufjs from 'protobufjs';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

class RemoteMessageManager {
  constructor() {
    this.root = null;
    this.RemoteMessage = null;
    this.RemoteKeyCode = null;
    this.RemoteDirection = null;

    // Load the .proto file asynchronously using react-native-fs
    const protoFilePath = `${RNFS.DocumentDirectoryPath}/remotemessage.proto`; // Ensure your proto file is located here

    RNFS.readFile(protoFilePath, 'utf8')
      .then((content) => {
        protobufjs.loadFromString(content, (err, root) => {
          if (err) throw err;

          this.root = root;
          this.RemoteMessage = this.root.lookupType('remote.RemoteMessage');
          this.RemoteKeyCode = this.root.lookupEnum('remote.RemoteKeyCode').values;
          this.RemoteDirection = this.root.lookupEnum('remote.RemoteDirection').values;
        });
      })
      .catch((error) => {
        console.error('Error reading remotemessage.proto:', error);
      });

    // Fetch manufacturer and model asynchronously
    DeviceInfo.getManufacturer().then((manufacturer) => {
      this.manufacturer = manufacturer;
      this.model = DeviceInfo.getModel();
    });
  }

  create(payload) {
    if (!payload.remotePingResponse) {
      console.debug('Create Remote ' + JSON.stringify(payload));
    }

    let errMsg = this.RemoteMessage.verify(payload);
    if (errMsg) throw Error(errMsg);

    let message = this.RemoteMessage.create(payload);
    let array = this.RemoteMessage.encodeDelimited(message).finish();

    if (!payload.remotePingResponse) {
      console.debug('Sending ' + JSON.stringify(message.toJSON()));
    }

    return array;
  }

  createRemoteConfigure(code1, model, vendor, unknown1, unknown2) {
    return this.create({
      remoteConfigure: {
        code1: code1,
        deviceInfo: {
          model: this.model,
          vendor: this.manufacturer,
          unknown1: unknown1,
          unknown2: unknown2,
          packageName: 'androidtv-remote',
          appVersion: '1.0.0',
        },
      },
    });
  }

  createRemoteSetActive(active) {
    return this.create({
      remoteSetActive: {
        active: active,
      },
    });
  }

  createRemotePingResponse(val1) {
    return this.create({
      remotePingResponse: {
        val1: val1,
      },
    });
  }

  createRemoteKeyInject(direction, keyCode) {
    return this.create({
      remoteKeyInject: {
        keyCode: keyCode,
        direction: direction,
      },
    });
  }

  createRemoteAdjustVolumeLevel(level) {
    return this.create({
      remoteAdjustVolumeLevel: level,
    });
  }

  createRemoteResetPreferredAudioDevice() {
    return this.create({
      remoteResetPreferredAudioDevice: {},
    });
  }

  createRemoteImeKeyInject(appPackage, status) {
    return this.create({
      remoteImeKeyInject: {
        textFieldStatus: status,
        appInfo: {
          appPackage: appPackage,
        },
      },
    });
  }

  createRemoteRemoteAppLinkLaunchRequest(app_link) {
    return this.create({
      remoteAppLinkLaunchRequest: {
        appLink: app_link,
      },
    });
  }

  parse(buffer) {
    return this.RemoteMessage.decodeDelimited(buffer);
  }
}

let remoteMessageManager = new RemoteMessageManager();

export { remoteMessageManager };
