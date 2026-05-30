# Database Schema

**Confidence Level:** [HIGH]

This project **does not use a database.**

It operates entirely as a stateless proxy that aggregates data from external APIs (GitHub GraphQL, GitHub REST, WakaTime) and renders it dynamically into SVGs. State is maintained via URL query parameters and external caching layers.