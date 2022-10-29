require('@babel/register')({
  extensions: ['.js', '.ts'],
  plugins: ['@babel/plugin-transform-modules-commonjs']
});
module.exports = require('../test/support/helper');
