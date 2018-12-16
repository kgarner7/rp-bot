module.exports = {
	apps: {
		env: {
			"NODE_ENV": "development"
		},
		env_production: {
			"NODE_ENV": "production"
		},
		instances: 1,
		name: "discordo bot",
    script: "./index.js",
    watch: true
	}
}