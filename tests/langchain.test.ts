import { describe, it, expect } from 'vitest';
import { AgentRuntime } from '../src/lib/runtime.js';
import { AgentDbLangchainMemory } from '../src/lib/langchain.js';

describe('AgentDbLangchainMemory', () => {
    it('should store messages via saveContext', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-test-seed');
        const memory = new AgentDbLangchainMemory(agent);

        await memory.saveContext(
            { input: 'What is 2+2?' },
            { output: '2+2 is 4.' }
        );

        const vars = memory.loadMemoryVariables({});
        expect(vars.history).toHaveLength(2);
        expect(vars.history[0]!.content).toBe('What is 2+2?');
        expect(vars.history[1]!.content).toBe('2+2 is 4.');
    });

    it('should accumulate multiple conversations', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-multi-test');
        const memory = new AgentDbLangchainMemory(agent);

        await memory.saveContext({ input: 'Hello' }, { output: 'Hi!' });
        await memory.saveContext({ input: 'Bye' }, { output: 'Goodbye!' });

        const vars = memory.loadMemoryVariables({});
        expect(vars.history).toHaveLength(4);
    });

    it('should use custom memory key', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-key-test');
        const memory = new AgentDbLangchainMemory(agent, 'chat_history');

        await memory.saveContext({ input: 'Test' }, { output: 'OK' });

        const vars = memory.loadMemoryVariables({});
        expect(vars).toHaveProperty('chat_history');
        expect(vars.chat_history).toHaveLength(2);
    });

    it('should clear memory', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-clear-test');
        const memory = new AgentDbLangchainMemory(agent);

        await memory.saveContext({ input: 'Test' }, { output: 'OK' });
        expect(memory.loadMemoryVariables({}).history).toHaveLength(2);

        await memory.clear();
        expect(memory.loadMemoryVariables({}).history).toHaveLength(0);
    });

    it('should return null stream ID before initialization', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-stream-test');
        const memory = new AgentDbLangchainMemory(agent);

        expect(memory.getStreamId()).toBeNull();
    });

    it('should format non-string inputs as JSON', async () => {
        const agent = await AgentRuntime.loadFromSeed('langchain-json-test');
        const memory = new AgentDbLangchainMemory(agent);

        const complexInput = { query: 'search', filters: [1, 2] };
        await memory.saveContext(complexInput, { output: 'results' });

        const vars = memory.loadMemoryVariables({});
        // When input doesn't have an 'input' key, it should be JSON.stringify'd
        expect(vars.history[0]!.content).toBe(JSON.stringify(complexInput));
    });
});
