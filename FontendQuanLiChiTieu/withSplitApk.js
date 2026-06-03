const { withAppBuildGradle } = require('@expo/config-plugins');

module.exports = function withSplitApk(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Find the enableSeparateBuildPerCPUArchitecture flag and set it to true
      config.modResults.contents = config.modResults.contents.replace(
        /def enableSeparateBuildPerCPUArchitecture = false/,
        'def enableSeparateBuildPerCPUArchitecture = true'
      );
    }
    return config;
  });
};
