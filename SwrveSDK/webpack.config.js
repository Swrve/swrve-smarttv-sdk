const path = require('path');

module.exports = function(env) {
    env = env || {};
    return {
        mode: 'production',
        entry: path.resolve(__dirname, 'src/index.ts'),
        module: {
            rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            compilerOptions: {
                                noEmit: false,
                                sourceMap: true,
                            }
                        }
                    },
                ].concat(env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test' ? [
                    {
                        loader: 'strip-loader',
                        options: {
                            strip: ['SwrveLogger.debug', 'SwrveLogger.info', 'SwrveLogger.warn']
                        }
                    }
                ] : [])
            }
            ]
        },
        resolve: {
            extensions: [ '.tsx', '.ts', '.js' ]
        },
        output: {
            filename: 'SwrveSDK.js',
            path: path.resolve(__dirname, 'dist'),
            library: 'SwrveSDK',
            libraryTarget: 'umd'
        },
    };
};
