const assert = require('node:assert/strict');
const test = require('node:test');

function loadServerWithEnv(env) {
    const previousEnv = {
        PORT: process.env.PORT,
        PUBLIC_HOST: process.env.PUBLIC_HOST,
        PUBLIC_PROTOCOL: process.env.PUBLIC_PROTOCOL,
        PUBLIC_PORT: process.env.PUBLIC_PORT
    };

    delete require.cache[require.resolve('../server')];
    Object.assign(process.env, env);
    for (const key of Object.keys(previousEnv)) {
        if (!(key in env)) {
            delete process.env[key];
        }
    }

    const server = require('../server');

    return {
        server,
        restore() {
            delete require.cache[require.resolve('../server')];
            for (const [key, value] of Object.entries(previousEnv)) {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            }
        }
    };
}

test('builds display URL from configured LAN host', () => {
    const { server, restore } = loadServerWithEnv({
        PUBLIC_HOST: '192.168.1.139',
        PORT: '8080'
    });

    assert.equal(server.buildPublicConfig().displayUrl, 'http://192.168.1.139:8080/display');

    restore();
});

test('builds public URL without port for HTTPS reverse proxy', () => {
    const { server, restore } = loadServerWithEnv({
        PUBLIC_HOST: 'teleprompter.example.com',
        PUBLIC_PROTOCOL: 'https',
        PUBLIC_PORT: '',
        PORT: '8080'
    });

    assert.equal(server.buildPublicConfig().displayUrl, 'https://teleprompter.example.com/display');

    restore();
});
