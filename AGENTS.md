# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

# Dependency rule

When adding or upgrading any Expo-ecosystem package (`expo-*`, `react`, `react-dom`, `react-native`, `react-native-*`, `@react-native-*`), always run **`npx expo install <pkg>`** — never `npm install <pkg>`. `npx expo install` picks the version Expo SDK 56 was built against; `npm install` will accept any release and silently introduce a runtime mismatch (the kind that produces a blank web screen with a red console error).

`npm run check:deps` runs automatically before `npm start`, `npm run web`, `npm run android`, `npm run ios`, and `npm test`. It refuses to launch when any Expo-managed dependency drifts from the SDK 56 pinned version (in `node_modules/expo/bundledNativeModules.json`) and prints the exact fix command.
