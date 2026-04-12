/**
 * OpenClaw Mini - Example Usage
 * 
 * This file demonstrates how to use the OpenClaw Mini agent system
 */

// Basic example function
export function greet(name: string): string {
  return `Hello, ${name}! Welcome to OpenClaw Mini!`;
}

// Example class
export class Example {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  getName(): string {
    return this.name;
  }

  greet(): string {
    return greet(this.name);
  }
}

// Demo usage
if (require.main === module) {
  const example = new Example("User");
  console.log(example.greet());
}

export default { greet, Example };