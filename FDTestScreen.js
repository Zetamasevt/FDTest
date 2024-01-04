import { StyleSheet, Text, View, TouchableOpacity, Alert, Dimensions} from 'react-native';
import React, { useState, useEffect, useRef } from 'react';
import { Camera, CameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
//import { useRouter } from 'expo-router';

const FDTestScreen = () => {
  //const router = useRouter();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const [hasPermission, setHasPermission] = useState(null);
  const [ScreenText, setScreenText] = useState('');
  const [shouldTakePictures, setShouldTakePictures] = useState(false);
  const exercise = 0;
  const [yaw, setYaw] = useState(0);
  const [roll, setRoll] = useState(0);

 
  const minYaw = 15;
  const minRoll = 7;
  const maxCounter = 1;
  const detectionInterval = 30;
  const minDegreeForPic = 2.5;
  const minTimeForPic = 200;

  const [savedTimestamp, setSavedTimestamp] = useState(new Date());

  const [maxR, setMaxR] = useState(0);
  const [maxL, setMaxL] = useState(0);
  
  const [lineCoordinates, setLineCoordinates] = useState(null);
  const cameraRef = useRef(null);
  const [evaluationStarted, setEvaluationStarted] = useState(false);
  const [evaluationActive, setEvaluationActive] = useState(false);
  const [evaluationSuccess, setEvaluationSuccess] = useState(false);
  const mutex = useRef(false);

  const [instruction, setInstruction] = useState('Anleitungstext');
  const [counterR, setCounterR] = useState(0);
  const [counterL, setCounterL] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  const takePicture = async () => {
    if (shouldTakePictures === false) return;
    const capturePromise = new Promise(async (resolve, reject) => {
      if (mutex.current) {return;}
      mutex.current = true;
      try {
        const options = { quality: 0.2, base64: false, skipProcessing: true };
        const photo = await cameraRef.current.takePictureAsync(options);
        resolve(photo);
      } catch (error) {
        console.error('Error taking picture:', error);
        reject(error);
      }
    });
    const timeout = 0;
    setTimeout(async () => {
      try {
        const capturedImage = await capturePromise;
        /*
        await FileSystem.moveAsync({
          from: capturedImage.uri,
          to: `${FileSystem.documentDirectory}${evaluationData.imageName}`,
        });
        */
        mutex.current = false;
      } catch (error) {
        console.error('Error capturing and storing image:', error);
      }
    }, timeout);
  };

  useEffect(() => {
    if (!evaluationActive) return;
    if (exercise === 0){
      updateLogicBasedOnCounters();
      if (yaw > minYaw && yaw < 180) {
        setCounterR(1);
        setScreenText('-> ' + yaw + '°');
        setMaxR((prev) => {
          if (yaw > prev) {
            //evaluationData.imageName = 'MaxYR.jpg';
            const diff = yaw-prev;
            const timestamp = new Date();
            const timeDifference = timestamp - savedTimestamp;
            if (diff > minDegreeForPic && timeDifference > minTimeForPic) {
              takePicture();
              setSavedTimestamp(timestamp); 
            }
          }
          return Math.max(prev, yaw);
        });
      } else if (yaw < (360-minYaw) && yaw > 180) {
        setCounterL(1);
        let yawL = 360 - yaw;
        setScreenText('<- ' + yawL + '°');
        setMaxL((prev) => {
          if (yawL > prev) {
            //evaluationData.imageName = 'MaxYL.jpg';
            const diff = yawL-prev;
            const timestamp = new Date();
            const timeDifference = timestamp - savedTimestamp;
            if (diff > minDegreeForPic && timeDifference > minTimeForPic) {
              takePicture();
              setSavedTimestamp(timestamp); 
            }
          }
          return Math.max(prev, yawL);
        });
      } else {
        updateLogicBasedOnCounters();
        setScreenText('');
      }
    }
  }, [yaw]);

  useEffect(() => {
    if (!evaluationActive) return;
    if (exercise === 1){
      updateLogicBasedOnCounters();
      if (roll > minRoll && roll < 80) {
        setCounterR(counterR + 1);
        setScreenText('-> ' + roll + '°');
        setMaxR((prev) => {
          if (roll > prev) {
            //evaluationData.imageName = 'MaxRR.jpg';
            const diff = roll-prev;
            const timestamp = new Date();
            const timeDifference = timestamp - savedTimestamp;
            if (diff > minDegreeForPic && timeDifference > minTimeForPic) {
              takePicture();
              setSavedTimestamp(timestamp); 
            } 
          }
          return Math.max(prev, roll);
        });
      } else if (roll < (360-minRoll) && roll > 280) {
        setCounterL(counterL + 1);
        let rollL = 360 - roll;
        setScreenText('<- ' + rollL + '°');
        setMaxL((prev) => {
          if (rollL > prev) {
            //evaluationData.imageName = 'MaxRL.jpg';
            const diff = rollL-prev;
            const timestamp = new Date();
            const timeDifference = timestamp - savedTimestamp;
            if (diff > minDegreeForPic && timeDifference > minTimeForPic) {
              takePicture();
              setSavedTimestamp(timestamp); 
            }
          }
          return Math.max(prev, rollL);
        });
      } else {
        updateLogicBasedOnCounters();
        setScreenText('');
      }
    }
  }, [roll]);

  const updateLogicBasedOnCounters = () => {
    if (!evaluationActive) return;
    if (counterR === 0 && counterL === 0) {
      if (exercise === 0) setInstruction('Kopf nach rechts oder links drehen <-->');
      else setInstruction('Kopf nach rechts oder links neigen <-->');
    }
    else if ((counterR >= 1 && counterL === 0)||(counterL >= 1 && counterR === 0)) setInstruction(''); 
    else if (counterR >= 1 && counterL >= 1) {
      if (exercise === 0 && !isYawNeutral()) return;
      else if (exercise === 1 && !isRollNeutral()) return;
      setInstruction('Super! Bewegung ' + (exercise+1) + ' abgeschlossen.');
      setEvaluationSuccess(true);
      if (counterR >= maxCounter && counterL >= maxCounter) {
        setTimeout(() => {
          if (evaluationStarted) exitEvaluation();
        }, 1000);
      }
    } 
  };

  const isYawNeutral = () => {return yaw < 5 || yaw > 355;};
  const isRollNeutral = () => {return roll <= 5 || roll >= 365;};

  const handleFacesDetected = ({ faces }) => {
    if (faces.length === 0) {
      setScreenText('Keine Erkennung');
      return;
    } else if (faces.length > 1) {
      console.log('Personen im Bild: ' + faces.length);
      return;
    } else if (faces.length > 0) {
      const face = faces[0];
      setYaw(face.yawAngle.toFixed(0));
      setRoll(face.rollAngle.toFixed(0));
      if (
        face.LEFT_EYE && face.RIGHT_EYE && face.BOTTOM_MOUTH 
      ) {
        const leftEye = face.RIGHT_EYE; 
        const rightEye = face.LEFT_EYE;
        const bottomMouth = face.BOTTOM_MOUTH;
        const lineCoordinates = {
          startX: leftEye.x, startY: leftEye.y,
          endX: rightEye.x, endY: rightEye.y,
          eyeCenterX: (leftEye.x + rightEye.x) / 2,
          eyeCenterY: (leftEye.y + rightEye.y) / 2,
          bottomX: bottomMouth.x, bottomY: bottomMouth.y,
        };
        setLineCoordinates(lineCoordinates);
      }
    }
  };
  
  const exitEvaluation = async () => {
    setEvaluationStarted(false);
    setEvaluationActive(false);
    setLineCoordinates(null);
    if (exercise === 0){
      //evaluationData.maxYL = maxL;
      //evaluationData.maxYR = maxR;
    }
    else if (exercise === 1){
      //evaluationData.maxRL = maxL;
      //evaluationData.maxRR = maxR;
    }
    else{
    console.log("Invalid exercise: " + exercise);
    }
    //router.push({pathname: 'evaluationComponents/evaluationControl'});
  };

  const cancelEvaluation = async () => {
    return Alert.alert(
      "Sind Sie sicher?",
      "Ihre Ergebnisse werden verworfen...",
      [
        {
          text: "Ja",
          onPress: () => {
            //const originScreen = evaluationData.originScreen;
            //evaluationData.resetValues();
            //router.push({pathname: originScreen});
          },
        },
        {
          text: "Nein",
        },
      ]
    );
  };

  const resetValues = async () => {
      console.log("Resetting values...");
      setCounterR(0);
      setCounterL(0);
      setYaw(0);
      setRoll(0);
      setMaxR(0);
      setMaxL(0);
      setScreenText('');
      setInstruction('');
      setLineCoordinates(null);
      console.log("Values resetted!");
  };

  useEffect(() => {
    if (!evaluationActive) {
      setTimeout(() => {
        setEvaluationStarted(true);
        setTimeout(() => {
          setEvaluationActive(true);
        }, 200);
      }, 100);
    }
  }, [evaluationActive]);

  return (
    <View style={styles.container}>
      {evaluationStarted ? (
        <Camera
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          type={CameraType.front}
          autoFocus={false}
          style={styles.camera}
          onFacesDetected={handleFacesDetected}
          faceDetectorSettings={{
            mode: FaceDetector.FaceDetectorMode.accurate,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
            runClassifications: FaceDetector.FaceDetectorClassifications.none,
            minDetectionInterval: {detectionInterval},
            tracking: true,
          }}
        >
          <Text style={styles.instructionText}>{instruction}</Text>
          {lineCoordinates && (
            <>
              {/* Fadenkreuz: */}
              {/* Linie durch Augenmitte vertikal */}
              <View
                style={{
                  position: 'absolute',
                  left: lineCoordinates.eyeCenterX,
                  top: lineCoordinates.eyeCenterY - 50,
                  width: 2,
                  height: 100,
                  backgroundColor: '#10069f',
                  transform: [{ rotate: `${roll}deg` }],
                }}></View>

              {/* Linie durch Augenmitte horizontal */}
              <View
                style={{
                  position: 'absolute',
                  left: lineCoordinates.eyeCenterX - 50,
                  top: lineCoordinates.eyeCenterY,
                  width: 100,
                  height: 2,
                  backgroundColor: '#10069f',
                  transform: [{ rotate: `${roll}deg` }],
                }}></View>

              {/* Linien vertikal und horizontal zur Bildmitte */}
              <View
                style={{
                  position: 'absolute',
                  left: (screenWidth - 1000) / 2,
                  top: (screenHeight - 1) / 2.5,
                  width: 1000,
                  height: 1,
                  backgroundColor: 'white',
                }}
              ></View>
              <View
                style={{
                  position: 'absolute',
                  left: (screenWidth - 1) / 2,
                  top: (screenHeight - 1000) / 2,
                  width: 1,
                  height: 1000,
                  backgroundColor: 'white',
                }}
                ></View>
            </>
          )}
        </Camera>
      ) : (
        <View style={styles.startScreen}>
          {/**/}
        </View>
      )}
      {evaluationStarted && (
        <TouchableOpacity onPress={cancelEvaluation} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>Abbrechen</Text>
        </TouchableOpacity>
      )}
      {evaluationStarted && (
        <View style={styles.maxValuesContainer}>
            <Text style={styles.maxValuesL}>Max L: {maxL}° </Text>
            <Text style={styles.faceDesc}>{ScreenText}</Text>
            <Text style={styles.maxValuesR}>Max R: {maxR}° </Text>
        </View>
      )}
      {evaluationSuccess && (
        <TouchableOpacity onPress={exitEvaluation} style={styles.continueButton}>
          <Text style={styles.continueButtonText}>Weiter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'grey',
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButton: {
    fontSize: 20,
    color: 'white',
    padding: 10,
    backgroundColor: '#10069f',
    margin: 20,
  },
  camera: {
    flex: 1,
  },
  resetButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#10069f',
    padding: 10,
    borderRadius: 5,
  },
  exitButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 5,
  },
  exitButtonText: {
    fontSize: 16,
    color: 'white',
  },
  continueButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    backgroundColor: 'yellow',
    padding: 10,
    borderRadius: 5,
  },
  continueButtonText: {
    fontSize: 16,
    color: 'black',
  },
  textContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  faceDesc: {
    fontSize: 20,
    color: 'white',
  },
  maxValuesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  maxValuesL: {
    fontSize: 24,
    textAlign: 'left',
    color: 'green',
  },
  maxValuesR: {
    fontSize: 24,
    textAlign: 'right',
    color: 'orange',
  },
  instructionText: {
    justifyContent: 'center',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    top: '20%',
    color: '#10069f',
  }
});

export default FDTestScreen;