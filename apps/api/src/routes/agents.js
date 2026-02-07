/**
 * AGENT API ROUTES - REAL AGENT ENDPOINTS
 */

import { AgentEngine } from '../agents/AgentEngine.js';
import { AdvancedAgents } from '../agents/AdvancedAgents.js';

export async function agentRoutes(fastify, options) {
    const agentEngine = new AgentEngine({
        openaiApiKey: process.env.OPENAI_API_KEY
    });
    
    const advancedAgents = new AdvancedAgents(agentEngine);

    // Create Auto-GPT agent
    fastify.post('/agents/auto-gpt', { preHandler: [fastify.auth] }, async (request) => {
        const { goal, constraints = [] } = request.body;
        if (!goal) throw fastify.httpErrors.badRequest('Goal is required');
        
        const agentId = await agentEngine.createAutoGPTAgent(goal, constraints);
        
        await fastify.auditLog(
            request.user.sub,
            'CREATE_AGENT',
            'agents',
            agentId,
            { type: 'auto-gpt', goal },
            request
        );
        
        return { agentId, type: 'auto-gpt', goal, status: 'active' };
    });

    // Create Baby-AGI agent
    fastify.post('/agents/baby-agi', { preHandler: [fastify.auth] }, async (request) => {
        const { objective, initialTask } = request.body;
        if (!objective || !initialTask) {
            throw fastify.httpErrors.badRequest('Objective and initialTask are required');
        }
        
        const agentId = await agentEngine.createBabyAGI(objective, initialTask);
        
        return { agentId, type: 'baby-agi', objective, status: 'active' };
    });

    // Execute task-driven agent step
    fastify.post('/agents/:id/execute', { preHandler: [fastify.auth] }, async (request) => {
        const agentId = request.params.id;
        const agent = await agentEngine.executeTaskDrivenAgent(agentId);
        
        if (!agent) {
            throw fastify.httpErrors.notFound('Agent not found');
        }
        
        return agent;
    });

    // Create autonomous researcher
    fastify.post('/agents/researcher', { preHandler: [fastify.auth] }, async (request) => {
        const { topic, sources = [] } = request.body;
        if (!topic) throw fastify.httpErrors.badRequest('Research topic is required');
        
        const agentId = await agentEngine.createAutonomousResearcher(topic, sources);
        
        return { agentId, type: 'autonomous-researcher', topic, status: 'researching' };
    });

    // Create recursive planner
    fastify.post('/agents/recursive-planner', { preHandler: [fastify.auth] }, async (request) => {
        const { goal, maxDepth = 3 } = request.body;
        if (!goal) throw fastify.httpErrors.badRequest('Goal is required');
        
        const plannerId = await advancedAgents.createRecursivePlanner(goal, maxDepth);
        
        return { plannerId, type: 'recursive-planner', goal, maxDepth, status: 'planning' };
    });

    // Create goal-seeking agent
    fastify.post('/agents/goal-seeking', { preHandler: [fastify.auth] }, async (request) => {
        const { goal, deadline } = request.body;
        if (!goal) throw fastify.httpErrors.badRequest('Goal is required');
        
        const agentId = await advancedAgents.createGoalSeekingAgent(goal, deadline);
        
        return { agentId, type: 'goal-seeking', goal, deadline, status: 'seeking' };
    });

    // Create multi-agent swarm
    fastify.post('/agents/swarm', { preHandler: [fastify.auth] }, async (request) => {
        const { task, agentCount = 3 } = request.body;
        if (!task) throw fastify.httpErrors.badRequest('Task is required');
        
        const swarmId = await agentEngine.createMultiAgentSwarm(task, agentCount);
        
        return { swarmId, type: 'multi-agent-swarm', task, agentCount, status: 'active' };
    });

    // Create tool router agent
    fastify.post('/agents/tool-router', { preHandler: [fastify.auth] }, async (request) => {
        const { availableTools } = request.body;
        if (!availableTools || !Array.isArray(availableTools)) {
            throw fastify.httpErrors.badRequest('Available tools array is required');
        }
        
        const agentId = await agentEngine.createToolRouterAgent(availableTools);
        
        return { agentId, type: 'tool-router', availableTools, status: 'active' };
    });

    // Create self-reflection agent
    fastify.post('/agents/self-reflection', { preHandler: [fastify.auth] }, async (request) => {
        const { task } = request.body;
        if (!task) throw fastify.httpErrors.badRequest('Task is required');
        
        const agentId = await agentEngine.createSelfReflectionAgent(task);
        
        return { agentId, type: 'self-reflection', task, status: 'active' };
    });

    // Create memory-augmented agent
    fastify.post('/agents/memory-augmented', { preHandler: [fastify.auth] }, async (request) => {
        const { goal } = request.body;
        if (!goal) throw fastify.httpErrors.badRequest('Goal is required');
        
        const agentId = await agentEngine.createMemoryAgent(goal);
        
        return { agentId, type: 'memory-augmented', goal, status: 'active' };
    });

    // Create long-term planner
    fastify.post('/agents/long-term-planner', { preHandler: [fastify.auth] }, async (request) => {
        const { vision, timeframe } = request.body;
        if (!vision || !timeframe) {
            throw fastify.httpErrors.badRequest('Vision and timeframe are required');
        }
        
        const plannerId = await advancedAgents.createLongTermPlanner(vision, timeframe);
        
        return { plannerId, type: 'long-term-planner', vision, timeframe, status: 'planning' };
    });

    // Create decision tree agent
    fastify.post('/agents/decision-tree', { preHandler: [fastify.auth] }, async (request) => {
        const { decisionContext } = request.body;
        if (!decisionContext) throw fastify.httpErrors.badRequest('Decision context is required');
        
        const agentId = await agentEngine.createDecisionTreeAgent(decisionContext);
        
        return { agentId, type: 'decision-tree', decisionContext, status: 'active' };
    });

    // Create self-critique loop
    fastify.post('/agents/self-critique', { preHandler: [fastify.auth] }, async (request) => {
        const { task, qualityCriteria } = request.body;
        if (!task || !qualityCriteria) {
            throw fastify.httpErrors.badRequest('Task and quality criteria are required');
        }
        
        const agentId = await advancedAgents.createSelfCritiqueLoop(task, qualityCriteria);
        
        return { agentId, type: 'self-critique', task, qualityCriteria, status: 'iterating' };
    });

    // Create execution controller
    fastify.post('/agents/execution-controller', { preHandler: [fastify.auth] }, async (request) => {
        const { controlledAgents = [] } = request.body;
        
        const controllerId = await advancedAgents.createExecutionController(controlledAgents);
        
        return { controllerId, type: 'execution-controller', controlledAgents, status: 'active' };
    });

    // Create world model agent
    fastify.post('/agents/world-model', { preHandler: [fastify.auth] }, async (request) => {
        const { domain } = request.body;
        if (!domain) throw fastify.httpErrors.badRequest('Domain is required');
        
        const agentId = await agentEngine.createWorldModelAgent(domain);
        
        return { agentId, type: 'world-model', domain, status: 'active' };
    });

    // Create strategy synthesis agent
    fastify.post('/agents/strategy-synthesis', { preHandler: [fastify.auth] }, async (request) => {
        const { problem, inputStrategies } = request.body;
        if (!problem || !inputStrategies) {
            throw fastify.httpErrors.badRequest('Problem and input strategies are required');
        }
        
        const agentId = await advancedAgents.createStrategySynthesisAgent(problem, inputStrategies);
        
        return { agentId, type: 'strategy-synthesis', problem, status: 'synthesizing' };
    });

    // Create adaptive reasoner
    fastify.post('/agents/adaptive-reasoner', { preHandler: [fastify.auth] }, async (request) => {
        const { domain, reasoningStyles } = request.body;
        if (!domain) throw fastify.httpErrors.badRequest('Domain is required');
        
        const reasonerId = await advancedAgents.createAdaptiveReasoner(domain, reasoningStyles);
        
        return { reasonerId, type: 'adaptive-reasoner', domain, status: 'active' };
    });

    // Use adaptive reasoner
    fastify.post('/agents/:id/reason', { preHandler: [fastify.auth] }, async (request) => {
        const reasonerId = request.params.id;
        const { problem, context } = request.body;
        if (!problem) throw fastify.httpErrors.badRequest('Problem is required');
        
        const result = await advancedAgents.reason(reasonerId, problem, context);
        
        if (!result) {
            throw fastify.httpErrors.notFound('Reasoner not found');
        }
        
        return { result };
    });

    // Create autonomous operator
    fastify.post('/agents/autonomous-operator', { preHandler: [fastify.auth] }, async (request) => {
        const { operationalContext, capabilities } = request.body;
        if (!operationalContext) throw fastify.httpErrors.badRequest('Operational context is required');
        
        const operatorId = await advancedAgents.createAutonomousOperator(operationalContext, capabilities);
        
        return { operatorId, type: 'autonomous-operator', operationalContext, status: 'operational' };
    });

    // Create meta-agent
    fastify.post('/agents/meta-agent', { preHandler: [fastify.auth] }, async (request) => {
        const { managedAgents = [] } = request.body;
        
        const agentId = await agentEngine.createMetaAgent(managedAgents);
        
        return { agentId, type: 'meta-agent', managedAgents, status: 'active' };
    });

    // List all agents
    fastify.get('/agents', { preHandler: [fastify.auth] }, async (request) => {
        const agents = agentEngine.getAllAgents();
        return { agents, count: agents.length };
    });

    // Get specific agent
    fastify.get('/agents/:id', { preHandler: [fastify.auth] }, async (request) => {
        const agent = agentEngine.getAgent(request.params.id);
        if (!agent) {
            throw fastify.httpErrors.notFound('Agent not found');
        }
        return agent;
    });

    // Stop agent
    fastify.post('/agents/:id/stop', { preHandler: [fastify.auth] }, async (request) => {
        agentEngine.stopAgent(request.params.id);
        
        await fastify.auditLog(
            request.user.sub,
            'STOP_AGENT',
            'agents',
            request.params.id,
            {},
            request
        );
        
        return { success: true };
    });

    // Delete agent
    fastify.delete('/agents/:id', { preHandler: [fastify.auth] }, async (request) => {
        const deleted = agentEngine.deleteAgent(request.params.id);
        if (!deleted) {
            throw fastify.httpErrors.notFound('Agent not found');
        }
        
        await fastify.auditLog(
            request.user.sub,
            'DELETE_AGENT',
            'agents',
            request.params.id,
            {},
            request
        );
        
        return { success: true };
    });
}