// The tests are written against the English text, whatever language the machine running them prefers.
Object.defineProperty(globalThis.navigator, 'language', { value: 'en-US', configurable: true });
