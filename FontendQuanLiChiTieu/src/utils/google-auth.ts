import { Platform } from 'react-native';
import Constants from 'expo-constants';

let GoogleSignin: any = null;
let statusCodes: any = {};
let isErrorWithCode: any = () => false;

// Only attempt to load GoogleSignin if NOT in Expo Go (standard app)
// OR if it's a Development Build
try {
    // We use require instead of import to prevent top-level crash on Expo Go
    const GoogleModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = GoogleModule.GoogleSignin;
    statusCodes = GoogleModule.statusCodes;
    isErrorWithCode = GoogleModule.isErrorWithCode;
} catch (e) {
    console.log('GoogleSignin native module not found, likely running in Expo Go');
}

export { GoogleSignin, statusCodes, isErrorWithCode };

export const isGoogleSigninAvailable = () => {
    return GoogleSignin !== null;
};
