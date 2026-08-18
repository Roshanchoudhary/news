# New features

## Roles
- Admin: all sections.
- Editor: News + Comments; can publish and manage all news.
- Author: News only; can create drafts and edit/delete only their own drafts. Authors cannot publish directly.

## Social share
News detail pages include WhatsApp, Facebook, X, Telegram, LinkedIn and Copy Link buttons. The title + short description/summary are included in share text where the platform supports text sharing. Open Graph description is also set from the news summary.

## AdSense
Admin > AdSense lets you set:
- Publisher ID
- Display slot ID
- Optional in-article slot ID
- Global AdSense enabled
- Auto Ads flag

In each news editor there is a single checkbox: `एहि post में AdSense advertisement देखाउ`. Ads are rendered only when both the global setting and this post checkbox are enabled.

## Analytics
Admin > Analytics shows:
- unique visitors
- page views
- post-wise unique visitors/views
- countries
- cities
- devices
- browsers
- daily traffic

The tracker uses a first-party random visitor ID. IP addresses are not stored. Country/city come from Cloudflare request location and can be approximate.

## D1
The app automatically creates the required tables. `NEW_FEATURES_SETUP.sql` is included if you prefer to create them manually.
