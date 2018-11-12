
const env = process.env.BABEL_ENV || 'esm';

module.exports = {
    presets: [
        ['@babel/react'],
        ['@babel/env', {
            targets: {
                node: '6.9', // LTS (Boron)
                browsers: ['>0.25%', 'not dead'],
            },
            
            // Whether to transpile modules
            modules: env === 'cjs' ? 'commonjs' : false,
        }],
    ],
    plugins: [
        '@babel/proposal-class-properties',
        '@babel/proposal-object-rest-spread',
        
        ['transform-builtin-extend', {
            // See: http://stackoverflow.com/questions/33870684/why-doesnt-instanceof-work
            globals: ['Error', 'String', 'Number', 'Array', 'Promise'],
        }],
    ],
};
