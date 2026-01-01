module.exports = {
    apps: [{
        name: 'antigravity-proxy',
        script: 'src/index.js',
        cwd: './Antigravity-Claude-Code-Proxy',
        watch: false,
        autorestart: true,
        max_restarts: 10,
        restart_delay: 2000,
        env: {
            NODE_ENV: 'production',
            PORT: 8080
        },
        error_file: './logs/pm2-error.log',
        out_file: './logs/pm2-out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        merge_logs: true
    }]
};
