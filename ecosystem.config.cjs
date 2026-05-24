module.exports = {
    apps: [{
        name: 'sport-mentor',
        script: 'index.js',
        watch: false,
        restart_delay: 5000,
        env: {
            NODE_ENV: 'production'
        }
    }]
}