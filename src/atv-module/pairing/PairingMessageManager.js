import protobufjs from 'protobufjs';
import DeviceInfo from 'react-native-device-info';
import RNFS from 'react-native-fs';

class PairingMessageManager {
  constructor() {
    this.root = null;
    this.PairingMessage = null;
    this.Status = null;
    this.RoleType = null;
    this.EncodingType = null;

    // Load the .proto file
    const protoFilePath = `${RNFS.DocumentDirectoryPath}/pairingmessage.proto`; // Assuming proto file exists here

    RNFS.readFile(protoFilePath, 'utf8')
      .then((content) => {
        protobufjs.loadFromString(content, (err, root) => {
          if (err) throw err;

          this.root = root;
          this.PairingMessage = this.root.lookupType('pairing.PairingMessage');
          this.Status = this.root.lookupEnum('pairing.PairingMessage.Status').values;
          this.RoleType = this.root.lookupEnum('RoleType').values;
          this.EncodingType = this.root.lookupEnum('pairing.PairingEncoding.EncodingType').values;
        });
      })
      .catch((error) => {
        console.error('Error reading .proto file:', error);
      });

    // Get manufacturer and model info
    DeviceInfo.getManufacturer().then((manufacturer) => {
      pairingMessageManager.manufacturer = manufacturer;
      pairingMessageManager.model = DeviceInfo.getModel();
    });
  }

  create(payload) {
    if (!this.PairingMessage) {
      throw new Error('PairingMessage type is not loaded yet');
    }

    let errMsg = this.PairingMessage.verify(payload);
    if (errMsg) throw Error(errMsg);

    let message = this.PairingMessage.create(payload);
    return this.PairingMessage.encodeDelimited(message).finish();
  }

  createPairingRequest(service_name) {
    return this.create({
      pairingRequest: {
        serviceName: service_name,
        clientName: this.model,
      },
      status: this.Status.STATUS_OK,
      protocolVersion: 2,
    });
  }

  createPairingOption() {
    return this.create({
      pairingOption: {
        preferredRole: this.RoleType.ROLE_TYPE_INPUT,
        inputEncodings: [
          {
            type: this.EncodingType.ENCODING_TYPE_HEXADECIMAL,
            symbolLength: 6,
          },
        ],
      },
      status: this.Status.STATUS_OK,
      protocolVersion: 2,
    });
  }

  createPairingConfiguration() {
    return this.create({
      pairingConfiguration: {
        clientRole: this.RoleType.ROLE_TYPE_INPUT,
        encoding: {
          type: this.EncodingType.ENCODING_TYPE_HEXADECIMAL,
          symbolLength: 6,
        },
      },
      status: this.Status.STATUS_OK,
      protocolVersion: 2,
    });
  }

  createPairingSecret(secret) {
    return this.create({
      pairingSecret: {
        secret: secret,
      },
      status: this.Status.STATUS_OK,
      protocolVersion: 2,
    });
  }

  parse(buffer) {
    return this.PairingMessage.decodeDelimited(buffer);
  }
}

let pairingMessageManager = new PairingMessageManager();
export { pairingMessageManager };