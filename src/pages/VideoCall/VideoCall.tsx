import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import {SocketContext} from '../../shared/SocketProvider';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
  MediaStreamTrack,
  mediaDevices,
  registerGlobals,
} from 'react-native-webrtc';
import {COLORS, SIZES} from '../../constants/theme';

const pc_config = {
  iceServers: [
    {
      urls: [
        'turn:13.250.13.83:3478?transport=udp',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
      ],
      username: 'YzYNCouZM1mhqhmseWk6',
      credential: 'YzYNCouZM1mhqhmseWk6',
    },
  ],
};
export default function VideoCall(props: any) {
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(
    null,
  );
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(
    null,
  );
  // const [peerConnection, setPeerconnection] = React.useState<any>(null);
  const peerConnection = new RTCPeerConnection(pc_config);
  const [mic, setMic] = React.useState(true);
  const [video, setVideo] = React.useState(true);
  const soc = React.useContext(SocketContext);
  const initilizePeerConnection = () => {
    soc.on('connection-success', success => {
      console.log(success);
    });

    soc.on('offerOrAnswer', sdp => {
      Alert.alert(
        'New Call',
        'You have a new call from ' + 'arnab',
        [
          {
            text: 'Reject',
            onPress: () => {
              // io.emit('reject-call', user?.username);
              // setRemoteUser(null);
              // setActiveCall(null);
              console.log('Rejected');
            },
            style: 'cancel',
          },
          {
            text: 'Accept',
            onPress: () => {
              // io.emit('accept-call', user?.username);
              // call.answer(newStream);
              // setActiveCall(call);
              console.log('Accepted');
              // sdp = JSON.stringify(sdp);

              // // set sdp as remote description
              // peerConnection.setRemoteDescription(
              //   new RTCSessionDescription(sdp),
              // );
              // navigate('Call');
            },
          },
        ],
        {cancelable: false},
      );
      // set sdp as remote description
      peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    soc.on('candidate', candidate => {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });
    peerConnection.onicecandidate = (e: any) => {
      if (e.candidate) {
        sendToPeer('candidate', e.candidate);
      }
    };

    // triggered when there is a change in connection state
    peerConnection.oniceconnectionstatechange = (e: any) => {
      console.log(e);
    };

    peerConnection.onaddstream = (e: any) => {
      // this.remoteVideoref.current.srcObject = e.streams[0]
      setRemoteStream(e.stream);
    };

    const success = (stream: any) => {
      console.log(stream.toURL());
      setLocalStream(stream);
      peerConnection.addStream(stream);
    };

    const failure = (e: any) => {
      console.log('getUserMedia Error: ', e);
    };

    let isFront = true;
    mediaDevices.enumerateDevices().then(sourceInfos => {
      console.log(sourceInfos);
      let videoSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (
          sourceInfo.kind == 'videoinput' &&
          sourceInfo.facing == (isFront ? 'front' : 'environment')
        ) {
          videoSourceId = sourceInfo.deviceId;
        }
      }

      const constraints = {
        audio: true,
        video: {
          mandatory: {
            minWidth: 1280,
            minHeight: 720,
            minFrameRate: 30,
          },
          facingMode: isFront ? 'user' : 'environment',
          optional: videoSourceId ? [{sourceId: videoSourceId}] : [],
        },
      };
      // @ts-ignore
      mediaDevices.getUserMedia(constraints).then(success).catch(failure);
    });
  };
  React.useEffect(() => {
    initilizePeerConnection();
  }, []);

  const sendToPeer = (messageType: string, payload: any) => {
    soc.emit(messageType, {
      roomId: '8428370008_8428370008',
      payload,
    });
  };
  const toggleMic = () => {
    if (localStream)
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setMic(!mic);
      });
  };
  const toggleVideo = () => {
    if (localStream) {
      // @ts-ignore
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setVideo(!video);
      });
    }
  };
  const toggleCamera = () => {
    if (localStream) {
      // @ts-ignore
      localStream.getVideoTracks().forEach(track => track._switchCamera());
    }
  };
  const endCall = () => {
    console.log('CODE FOR END CALL');
    peerConnection.getLocalStreams().forEach((stream: any) => {
      stream.getTracks().forEach((track: any) => {
        track.stop();
      });
    });
    peerConnection.close();
    props.navigation.goBack();
    //AFTER ENDING CALL NAVIGATE BACK TO CHAT
  };
  const createOffer = () => {
    peerConnection
      .createOffer({
        //@ts-ignore
        offerToReceiveAudio: 1,
        //@ts-ignore
        offerToReceiveVideo: 1,
      })
      .then((sdp: any) => {
        peerConnection.setLocalDescription(sdp);
        sendToPeer('offerOrAnswer', sdp);
      });
  };

  const createAnswer = () => {
    console.log('Answer');
    peerConnection
      .createAnswer({
        //@ts-ignore
        offerToReceiveVideo: 1,
        offerToReceiveAudio: 1,
      })
      .then((sdp: any) => {
        peerConnection.setLocalDescription(sdp);

        sendToPeer('offerOrAnswer', sdp);
      });
  };

  const remoteVideo = true ? (
    <RTCView
      key={2}
      mirror={true}
      style={{...styles.rtcViewRemote}}
      objectFit="contain"
      // @ts-ignore
      streamURL={remoteStream && remoteStream.toURL()}
    />
  ) : (
    <View
      style={{
        height: SIZES.height,
        width: SIZES.width,
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          fontSize: 22,
          textAlign: 'center',
          color: 'white',
          justifyContent: 'center',
          backgroundColor: 'black',
        }}>
        Connecting...
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: COLORS.primary[100]}}>
      <StatusBar backgroundColor="green" barStyle={'dark-content'} />
      <View style={{...styles.buttonsContainer}}>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createOffer}>
            <View style={styles.button}>
              <Text style={{...styles.textContent}}>Call</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{flex: 1}}>
          <TouchableOpacity onPress={createAnswer}>
            <View style={styles.button}>
              <Text style={{...styles.textContent}}>Answer</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      <View style={{...styles.videosContainer}}>
        <View
          style={{
            position: 'absolute',
            zIndex: 1,
            top: 20,
            right: 3,
            backgroundColor: 'orange', //width: '100%', height: '100%'
          }}>
          <View style={{flex: 1}}>
            <TouchableOpacity
              onPress={() =>
                //@ts-ignore
                localStream!._tracks[1]._switchCamera()
              }>
              <View>
                <RTCView
                  key={1}
                  zOrder={0}
                  objectFit="cover"
                  style={{...styles.rtcView}}
                  // @ts-ignore
                  streamURL={localStream && localStream.toURL()}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView style={{...styles.scrollView}}>
          <View
            style={{
              flex: 1,
              width: '100%',
              backgroundColor: 'black',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {remoteVideo}
          </View>
        </ScrollView>
      </View>
      <View style={styles.bottomButtonsContainer}>
        <TouchableOpacity onPress={toggleMic}>
          <View style={styles.circularButtonWrapper}>
            {mic ? (
              <Feather name="mic" size={26} color="white" />
            ) : (
              <Feather name="mic-off" size={26} color="white" />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleVideo}>
          <View style={styles.circularButtonWrapper}>
            {video ? (
              <Feather name="video" size={26} color="white" />
            ) : (
              <Feather name="video-off" size={26} color="white" />
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleCamera}>
          <View style={styles.circularButtonWrapper}>
            <MaterialCommunityIcons
              name="camera-switch-outline"
              size={26}
              color="white"
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={endCall}>
          <View style={[styles.circularButtonWrapper, styles.endCallWrapper]}>
            <Feather name="phone-call" size={26} color="white" />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  endCallWrapper: {
    backgroundColor: 'red',
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: '8%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
  },
  circularButtonWrapper: {
    borderRadius: 50,
    backgroundColor: COLORS.primary[400],
    padding: 17,
  },
  buttonsContainer: {
    flexDirection: 'row',
  },
  button: {
    margin: 5,
    paddingVertical: 10,
    backgroundColor: 'lightgrey',
    borderRadius: 5,
  },
  textContent: {
    fontFamily: 'Avenir',
    fontSize: 20,
    textAlign: 'center',
  },
  videosContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  rtcView: {
    width: 120, //dimensions.width,
    height: 180, //dimensions.height / 2,
    backgroundColor: 'purple',
    zIndex: 100,
    position: 'absolute',
    right: 5,
  },
  scrollView: {
    flex: 1,
    // flexDirection: 'row',
    // backgroundColor: 'teal',
    padding: 15,
  },
  rtcViewRemote: {
    width: SIZES.width,
    height: SIZES.height, //dimensions.height / 2,
    backgroundColor: 'black',
  },
});
