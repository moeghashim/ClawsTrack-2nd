# Environment Contract

Required:
- `MONITORED_REPOS` - comma-separated GitHub repo URLs
- `OPENAI_API_KEY`
- `DATABASE_URL`

Recommended:
- `NOTIFICATION_PROVIDER`
- provider-specific config (`SMTP_*` for email)

Parsing rule for `MONITORED_REPOS`:
1. split by `,`
2. trim whitespace
3. keep only valid GitHub repo URLs
4. deduplicate
