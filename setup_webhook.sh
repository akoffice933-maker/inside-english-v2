#!/bin/bash

# Setup script for Inside English v2.0 Telegram Bot Webhook
# Author: Lead Architect / CTO
# Usage: ./setup_webhook.sh <your-production-domain>

set -e

# Load .env variables if file exists
if [ -f .env ]; then
  export $(echo $(cat .env | sed 's/#.*//g' | xargs) | envsubst)
fi

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "❌ Error: Missing domain name."
  echo "Usage: ./setup_webhook.sh <your-production-domain>"
  echo "Example: ./setup_webhook.sh inside-english.vercel.app"
  exit 1
fi

# Clean up domain format (strip protocol and trailing slash if entered)
CLEAN_DOMAIN=$(echo "$DOMAIN" | sed -e 's|^[^/]*//||' -e 's|/$||')

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_BOT_TOKEN is not defined in environment or .env file."
  exit 1
fi

if [ -z "$TELEGRAM_WEBHOOK_SECRET_TOKEN" ]; then
  echo "❌ Error: TELEGRAM_WEBHOOK_SECRET_TOKEN is not defined in environment or .env file."
  exit 1
fi

WEBHOOK_URL="https://${CLEAN_DOMAIN}/api/telegram/webhook"

echo "🤖 Setting Telegram Bot Webhook..."
echo "🔗 Webhook Endpoint: $WEBHOOK_URL"
echo "🔐 Using secret_token: ${TELEGRAM_WEBHOOK_SECRET_TOKEN:0:4}***${TELEGRAM_WEBHOOK_SECRET_TOKEN: -4}"

RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"$WEBHOOK_URL\", \"secret_token\": \"$TELEGRAM_WEBHOOK_SECRET_TOKEN\"}")

OK=$(echo "$RESPONSE" | grep -o '"ok":true')

if [ -n "$OK" ]; then
  echo "✅ Webhook successfully configured!"
  echo "📝 Telegram API Response: $RESPONSE"
else
  echo "❌ Webhook configuration failed."
  echo "📝 Telegram API Response: $RESPONSE"
  exit 1
fi

echo "🔍 Fetching webhook status..."
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
echo ""
echo "🚀 Inside English v2.0 Telegram Bot is ready for production!"
