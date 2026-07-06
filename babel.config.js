module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@theme': './src/theme',
            '@components': './src/components',
            '@hooks': './src/hooks',
            '@store': './src/store',
            '@lib': './src/lib',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  }
}
