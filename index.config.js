module.exports = {
	apps: {
		env: {
			"NODE_ENV": "development",
		},
		env_production: {
			"NODE_ENV": "production",
		},
		instances: 1,
		kill_timeout: 6000,
		name: "discordo bot",
		script: `dist/index.js`
	}
}