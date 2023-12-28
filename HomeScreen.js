import React from 'react';
import { View, Button } from 'react-native';

const HomeScreen = ({ navigation }) => {
  return (
    <View>
      <Button
        title="Go to Face Detector Test Screen"
        onPress={() => navigation.navigate('FDTestScreen')}
      />
    </View>
  );
};

export default HomeScreen;