const appJson = require("./app.json");

module.exports = () => {
  const config = { ...appJson.expo };
  config.android = { ...config.android, package: config.android?.package || "com.anonymous.holisticmind" };
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME?.trim();
  if (iosUrlScheme) {
    config.plugins = [
      ...(config.plugins || []),
      ["@react-native-google-signin/google-signin", { iosUrlScheme }],
    ];
  }
  return config;
};
