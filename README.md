[![njsscan sarif](https://github.com/Nicat-dcw/openai-proxy/actions/workflows/njsscan.yml/badge.svg)](https://github.com/Nicat-dcw/openai-proxy/actions/workflows/njsscan.yml)
# OpenAI Proxy

A TypeScript-based OpenAI Compatible gateway that provides a unified interface for multiple AI model providers (OpenAI, Anthropic, etc.) with features like authentication, rate limiting, and provider fallback.
This Projects inspired from [uni-api](https://github.com/yym68686/uni-api)


## 🚀 Features

- **Multi-Provider Support**: Seamlessly integrate with OpenAI, Anthropic, and more
- **Authentication**: API key-based access control
- **Rate Limiting**: Configurable daily request limits
- **Premium Access**: Tiered access to premium AI models
- **Provider Fallback**: Automatic failover between providers
- **Health Checks**: Continuous provider health monitoring

## 📋 Prerequisites

- Node.js 16+
- Bun runtime
- API keys for providers (OpenAI, Anthropic, etc.)

## 🛠️ Installation

```bash
# Clone the repository
git clone https://github.com/Nicat-dcw/openai-proxy.git

# Install dependencies
bun install

# Create configuration
cp src/config.yml.example src/config.yml

# Generate API key
bun run src/scripts/create-key.ts --premium
```

## ⚙️ Configuration

### Provider Setup (config.yml)
```yaml
providers:
  openai:
    apiKey: ${OPENAI_API_KEY}
    baseUrl: https://api.openai.com/v1
    models:
      - gpt-4: openai/gpt-4
  anthropic:
    apiKey: ${ANTHROPIC_API_KEY}
    baseUrl: https://api.anthropic.com/v1
    models:
      - claude-3-sonnet: anthropic/claude-3-sonnet
```

### Environment Variables
```bash
OPENAI_API_KEY=your_openai_key
PORT=3000  # Optional, defaults to 3000
```

## 🚦 API Endpoints

### Get Available Models
```http
GET /v1/models
Authorization: Bearer YOUR_API_KEY
```

### Chat Completion
```http
POST /v1/chat/completions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "model": "openai/gpt-4",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}
```

### Get Provider Status
```http
GET /v1/providers
Authorization: Bearer YOUR_API_KEY
```

## 🧪 Testing

```bash
# Run test suite
bun run src/test.ts

# Start server with tests
bun run src/scripts/start.ts
```

## 📁 Project Structure

```
src/
├── config/           # Configuration management
├── middleware/       # Auth & request handling
├── providers/        # AI provider integration
├── services/        # Core business logic
├── scripts/         # Utility scripts
├── utils/           # Helper utilities
└── index.ts         # Main application
```

## 🔒 Security

- API keys are securely stored and hashed
- Rate limiting prevents abuse
- Premium model access control
- Provider API keys are environment-variable based

## 📝 Logging

Built-in logging utility with colored output:
- ℹ️ INFO: General information
- ❌ ERROR: Error messages
- ⚠️ WARN: Warning messages
- 🔍 DEBUG: Debug information
- ✅ SUCCESS: Success messages

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for their API
- Github for free service
- Bun runtime team
- Elysia framework
