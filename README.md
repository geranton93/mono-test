# Currency Converter API

A NestJS-based currency converter application that fetches exchange rates from the Monobank API and provides a RESTful API endpoint for converting currencies. The application implements caching using Redis to improve performance.

---

## Table of Contents

- [Features](#features)
- [Task Description](#task-description)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Using Docker Compose](#using-docker-compose)
  - [Running Locally Without Docker](#running-locally-without-docker)
- [Running Tests](#running-tests)
  - [Prerequisites for Testing](#prerequisites-for-testing)
  - [End-to-End (e2e) Tests](#end-to-end-e2e-tests)
  - [Test Coverage](#test-coverage)
- [API Documentation](#api-documentation)
- [Usage](#usage)
  - [Example Request](#example-request)
  - [Example Response](#example-response)
- [Error Handling](#error-handling)
- [Project Structure](#project-structure)
- [Built With](#built-with)

---

## Features

- **Currency Conversion**: Convert amounts from one currency to another using up-to-date exchange rates.
- **Monobank API Integration**: Fetches the latest exchange rates from the Monobank public API.
- **Caching with Redis**: Implements a caching layer to store exchange rates for improved performance.
- **API Documentation**: Provides interactive API documentation using Swagger UI.
- **Error Handling**: Graceful error handling with informative responses.
- **Logging**: Uses NestJS Pino logger for structured logging.
- **Validation**: Validates incoming requests using `class-validator`.

---

## Task Description

### Goal

Create a Node.js application that serves as a currency converter, fetching exchange rates from the Monobank API and implementing a caching layer to improve performance.

### Requirements

1. **Node.js Backend**:
   - Develop a Node.js backend application that exposes an endpoint for converting currencies.
   - NestJS and TypeScript preferable.

2. **Currency Conversion**:
   - Implement a route (using POST method) to handle currency conversion requests.
   - The route should accept parameters for the source currency code, target currency code, and amount to convert.

3. **Data Fetching**:
   - Fetch the latest exchange rates from the Monobank API (`https://api.monobank.ua/bank/currency`).
   - Ensure proper error handling for API requests.

4. **Caching Layer**:
   - Implement a caching mechanism to store fetched exchange rates for a specified duration.
   - Use Redis.
   - Cached rates should expire after a configurable period to ensure freshness.

5. **Currency Conversion Logic**:
   - Use the fetched exchange rates for currency conversion.
   - Implement the logic to convert the specified amount from the source currency to the target currency based on the fetched rates.

6. **Error Handling**:
   - Handle errors gracefully and provide informative responses to clients in case of invalid requests or errors during currency conversion.

### Additional Notes

- Feel free to use any npm packages or libraries that you find suitable for the task.
- Provide instructions for running the application locally and any necessary setup steps.
- You may choose any suitable development practices and architectural patterns.

### Submission

- Share the source code of your solution via a GitHub repository or any other suitable platform.
- Include instructions for running the application and any additional notes or considerations.

---

## Prerequisites

- **Docker**: You need ot have Docker installed to run application.

---

## Installation

1. **Clone the Repository**

   ```bash
   git clone https://github.com/geranton93/mono-test
   cd mono-test
   ```

---

**Notes**:

- Ensure that the environment variable names match exactly as they are used in the application configuration.
- The variable names use double underscores (e.g., `redis__host`), so your configuration code should access these variables accordingly.
- Since `NODE_ENV` is set to `test`, make sure your application handles this environment appropriately.
- If you are using Docker Compose, the Redis host should be set to `redis` as specified.

---

## Running the Application

### Using Docker Compose

The application includes a `Dockerfile` and `docker-compose.yml` for easy setup using Docker.

1. **Ensure Docker and Docker Compose are Installed**

   - [Docker Installation Guide](https://docs.docker.com/get-docker/)
   - [Docker Compose Installation Guide](https://docs.docker.com/compose/install/)

2. **Start the Application**

   ```bash
   docker-compose up --build
   ```

   This command will:

   - Build the Docker image for the application.
   - Start the NestJS application container.
   - Start a Redis container for caching.

3. **Access the Application**

   - **API Endpoint**: `http://localhost:3000`
   - **Swagger UI**: `http://localhost:3000/api`

### Running Locally Without Docker

1. **Start Redis**

   Ensure that a Redis server is running locally on your machine.

   - **Option 1**: Install Redis locally.
     - [Redis Installation Guide](https://redis.io/topics/quickstart)
   - **Option 2**: Use Docker to run Redis.
     ```bash
     docker-compose up redis --build
     ```

2. **Run the Application**

  ```bash
    npm i
  ```

  ```bash
    npm run start
  ```

3. **Access the Application**

   - **API Endpoint**: `http://localhost:3000`
   - **Swagger UI**: `http://localhost:3000/api`

---

## Running Tests

The application includes unit tests and end-to-end (e2e) tests to ensure functionality and reliability.

### Prerequisites for Testing

- **Docker**: Required to run Redis for tests.
- **Node.js and npm**: Ensure you have Node.js (version 14 or higher) and npm installed.

### Install Dependencies

Before running the tests, make sure to install all necessary dependencies:

```bash
npm install
```

### Start Redis for Testing

The tests require a running Redis instance. You can start Redis using Docker:

```bash
docker-compose up -d redis
```

This command will start the Redis container in detached mode.

Alternatively, if you have Redis installed locally, ensure it's running on the default port (6379).

### End-to-End (e2e) Tests

To run the end-to-end tests:

```bash
npm run test:e2e
```

This command will execute tests located in the `test` directory, simulating real user interactions with the application.

### Important Notes on Testing

- **Cleaning Redis Before Tests**: The tests automatically clean the Redis cache before running to ensure a consistent testing environment.
- **Environment Variables**: The tests use the same `.env` file as the application. Ensure all necessary environment variables are set.
- **Mocking External Services**: The tests mock external API calls (e.g., Monobank API) to avoid relying on external services during testing.
- **Redis Container for Tests**: If you're using Docker Compose, ensure the Redis container is running before executing tests:
  ```bash
  docker-compose up -d redis
  ```
- **Test Scripts in `package.json`**:
  - `"test"`: Runs unit tests.
  - `"test:e2e"`: Runs end-to-end tests.
  - `"test:cov"`: Runs tests and generates a coverage report.

---

## API Documentation

The application uses Swagger for API documentation. You can access the interactive API docs at:

- **URL**: `http://localhost:3000/api`

The Swagger UI provides detailed information about the API endpoints, request parameters, and responses.

---

## Usage

### Example Request

**Endpoint**: `POST /currency/convert`

**Headers**:

- `Content-Type: application/json`

**Request Body**:

```json
{
  "from": "USD",
  "to": "EUR",
  "amount": 100
}
```

- **`from`**: The ISO currency code of the source currency (e.g., "USD" for US Dollars).
- **`to`**: The ISO currency code of the target currency (e.g., "EUR" for Euros).
- **`amount`**: The amount you wish to convert (must be greater than zero).

### Example Response

```json
{
  "from": "USD",
  "to": "EUR",
  "amount": 100,
  "convertedAmount": 85.50
}
```

- **`convertedAmount`**: The converted amount in the target currency.

---

## Error Handling

The API provides informative error responses with appropriate HTTP status codes.

### Example: Invalid Currency Code

**Response**:

```json
{
  "statusCode": 400,
  "message": "Invalid ISO currency code: ABC",
  "timestamp": "2024-10-05T12:00:00.000Z",
  "path": "/currency/convert"
}
```

### Example: Negative Amount

**Response**:

```json
{
  "statusCode": 400,
  "message": "Amount must be greater than zero",
  "timestamp": "2024-10-05T12:00:00.000Z",
  "path": "/currency/convert"
}
```

---

## Project Structure

```
currency-converter-api/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── envconfig.ts
│   ├── currency/
│   │   ├── currency.controller.ts
│   │   ├── currency.module.ts
│   │   ├── currency.service.ts
│   │   ├── monobank.service.ts
│   │   └── dto/
│   │       ├── convert-currency.dto.ts
│   │       └── convert-currency-response.dto.ts
│   ├── common/
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts
│   │   └── interfaces/
│   │       └── currency-rate.interface.ts
├── .env
├── .env.example
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## Built With

- **[NestJS](https://nestjs.com/)** - A progressive Node.js framework for building efficient, reliable, and scalable server-side applications.
- **[TypeScript](https://www.typescriptlang.org/)** - A typed superset of JavaScript that compiles to plain JavaScript.
- **[Redis](https://redis.io/)** - An open-source, in-memory data structure store used as a database, cache, and message broker.
- **[Monobank API](https://api.monobank.ua/docs/)** - Public API for fetching currency exchange rates.
- **[Swagger](https://swagger.io/)** - API documentation and design tools.
- **[Pino Logger](https://getpino.io/#/)** - A low overhead logging library.
- **[Docker](https://www.docker.com/)** - Containerization platform.

---