require('@babel/register')({
  extensions: ['.js', '.ts'],
  plugins: ['@babel/plugin-transform-modules-commonjs']
});
require('../test/support/helper');
