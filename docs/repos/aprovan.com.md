# aprovan.com

Website and backend for Aprovan Labs (https://aprovan.com). Includes design system and documentation.

## Language/Framework

React (Create React App), TypeScript, Tailwind CSS

## Installation

```bash
cd repos/aprovan.com
npm ci
```

## Running

```bash
# Development
npm start
# Web app starts on port 4200

# Production build
npm run build
```

## Project Structure

```
apps/web/          # React web application
```

## Using the Design System

The project includes a design system with reusable components:

```tsx
import { Button, Card, Input } from "@aprovan/ui";

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter your name" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## Backend

Uses AWS Amplify for backend services and authentication.
