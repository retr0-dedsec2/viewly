import 'dotenv/config'
import fs from 'fs'

const required = [
 'NODE_ENV',
 'JWT_SECRET',
 'COOKIE_SECURE',
 'FRONTEND_ORIGIN',
 'DATA_DIR',
 'UPLOADS_DIR',
 'PAYPAL_CLIENT_ID',
 'PAYPAL_CLIENT_SECRET',
]

function isPlaceholder(value = '') {
 return /^(replace|replace_me|changeme|change_me|your|example|test)([_-].*)?$/i.test(String(value).trim())
}

function hasValue(key) {
 const value = process.env[key]
 return Boolean(value && !isPlaceholder(value))
}

function fail(message) {
 console.error(`Preflight failed: ${message}`)
 process.exitCode = 1
}

for (const key of required) {
 if (!hasValue(key)) fail(`${key} is missing or still a placeholder.`)
}

if (process.env.NODE_ENV !== 'production') fail('NODE_ENV must be production.')
if (process.env.COOKIE_SECURE !== 'true') fail('COOKIE_SECURE must be true.')
if (process.env.ENABLE_SELF_SERVICE_BILLING === 'true') fail('ENABLE_SELF_SERVICE_BILLING should stay false in production.')

for (const key of ['DATA_DIR', 'UPLOADS_DIR']) {
 const value = process.env[key]
 if (value && !fs.existsSync(value)) {
 fail(`${key} points to a path that does not exist: ${value}`)
 }
}

if (!process.exitCode) {
 console.log('Production preflight passed.')
}
