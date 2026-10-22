import { Hono } from 'hono';
import { getEnabledSocialProviders, getSocialProviderDetails } from './auth';
import config from './config';
import { resolveSettings } from './lib/settings';
import openapi from './openapi';
import accountRoute from './routes/account';
import analyticsRoute from './routes/analytics';
import apiKeysRoute from './routes/api-keys';
import filesRoute from './routes/files';
import healthRoute from './routes/health';
import instanceRoute from './routes/instance';
import { invitePublicRoute, inviteRoute } from './routes/invites';
import metricsRoute from './routes/metrics';
import secretRequestsRoute from './routes/secret-requests';
import secretsRoute from './routes/secrets';
import setupRoute from './routes/setup';
import { userRoute } from './routes/user';

// Create a new router
const routes = new Hono()
    .route('/secrets', secretsRoute)
    .route('/secret-requests', secretRequestsRoute)
    .route('/account', accountRoute)
    .route('/files', filesRoute)
    .route('/user', userRoute)
    .route('/instance', instanceRoute)
    .route('/analytics', analyticsRoute)
    .route('/invites/public', invitePublicRoute)
    .route('/invites', inviteRoute)
    .route('/setup', setupRoute)
    .route('/api-keys', apiKeysRoute)
    .route('/metrics', metricsRoute)
    .route('/health', healthRoute)
    .route('/', openapi)
    // Legacy liveness endpoint (kept for backwards compatibility)
    .get('/healthz', (c) => c.json({ status: 'healthy', timestamp: new Date().toISOString() }))
    .get('/config/social-providers', (c) => {
        const providers = getEnabledSocialProviders();
        const baseUrl = process.env.HEMMELIG_BASE_URL || c.req.header('origin') || '';
        const callbackBaseUrl = baseUrl ? `${baseUrl}/api/auth/callback` : '';

        return c.json({
            providers,
            // Button text and icons for each provider. `providers` stays for older clients.
            providerDetails: getSocialProviderDetails(),
            // UI option only: the server still accepts password sign-in.
            hidePasswordLogin: config.getHidePasswordLogin() && providers.length > 0,
            callbackBaseUrl,
        });
    })
    .get('/manifest.json', async (c) => {
        const settings = (await resolveSettings()) as { instanceName?: string } | null;
        const name = settings?.instanceName || 'Hemmelig';
        return c.json({
            name,
            short_name: name,
            theme_color: '#deefea',
            background_color: '#231e23',
            display: 'standalone',
            orientation: 'portrait',
            scope: '/',
            start_url: '/',
            icons: [
                { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
                { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
                { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
                { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
                { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
                { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
                {
                    src: 'icons/maskable-icon-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'maskable',
                },
                { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
                { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            ],
        });
    });

export default routes;

export type AppType = typeof routes;
