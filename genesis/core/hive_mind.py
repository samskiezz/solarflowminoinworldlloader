"""
PROJECT SOLAR: GENESIS OMEGA - Hive Mind Core
The distributed intelligence coordination system
"""

import asyncio
import json
import uuid
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AgentTier(Enum):
    """Agent hierarchy tiers as per the architecture"""
    TIER_0_RAW = "raw_model"      # Base model capabilities
    TIER_1_TOOLS = "tool_users"   # Can use Python/tools
    TIER_2_ORCHESTRATORS = "orchestrators"  # AutoGen managers
    TIER_3_SAGES = "sages"        # RAG-enhanced historical analysis

class AgentRole(Enum):
    """Specialized agent roles"""
    SOLAR_ENGINEER = "Solar_Engineer"
    PV_DESIGNER = "PV_Designer" 
    GRID_ANALYST = "Grid_Analyst"
    DATA_PHILOSOPHER = "Data_Philosopher"
    COMPLIANCE_OFFICER = "Compliance_Officer"
    WEATHER_ORACLE = "Weather_Oracle"
    FINANCIAL_ADVISOR = "Financial_Advisor"
    QUANTUM_NAVIGATOR = "Quantum_Navigator"

@dataclass
class MinionState:
    """State representation for a single minion agent"""
    id: str
    role: AgentRole
    tier: AgentTier
    tool_access: List[str]
    spark: float  # Curiosity level 0-100
    active: bool
    last_action: Optional[str]
    memory_fragments: List[str]
    quantum_coherence: float
    collaboration_score: float
    created_at: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            **asdict(self),
            'role': self.role.value,
            'tier': self.tier.value,
            'created_at': self.created_at.isoformat()
        }

class MinionNode:
    """Individual minion agent with cognitive capabilities"""
    
    def __init__(self, role: AgentRole, tier: AgentTier, tools: List[str]):
        self.state = MinionState(
            id=str(uuid.uuid4())[:8],
            role=role,
            tier=tier,
            tool_access=tools,
            spark=50.0 + (hash(role.value) % 50),  # Deterministic but varied
            active=True,
            last_action=None,
            memory_fragments=[],
            quantum_coherence=0.5,
            collaboration_score=0.0,
            created_at=datetime.now()
        )
        self.conversation_history = []
        
    async def run_quantum_decision(self, options: List[str]) -> str:
        """
        Quantum-inspired decision making using Qiskit
        Simulates superposition and measurement for tie-breaking
        """
        try:
            # Import Qiskit components
            from qiskit import QuantumCircuit, transpile
            from qiskit_aer import AerSimulator
            import numpy as np
            
            # Create quantum circuit for decision
            qc = QuantumCircuit(len(options), len(options))
            
            # Put qubits in superposition
            for i in range(len(options)):
                qc.h(i)
            
            # Add entanglement for complex decisions
            if len(options) > 1:
                for i in range(len(options) - 1):
                    qc.cx(i, i + 1)
            
            # Measure all qubits
            qc.measure_all()
            
            # Simulate the quantum circuit
            simulator = AerSimulator()
            transpiled_qc = transpile(qc, simulator)
            job = simulator.run(transpiled_qc, shots=1024)
            result = job.result()
            counts = result.get_counts(transpiled_qc)
            
            # Select option based on measurement statistics
            max_count = max(counts.values())
            winning_states = [state for state, count in counts.items() if count == max_count]
            selected_state = winning_states[0]  # Take first if tie
            
            # Convert binary state to option index
            option_index = int(selected_state, 2) % len(options)
            
            self.state.quantum_coherence = max_count / 1024
            self.state.last_action = f"quantum_decision_{option_index}"
            
            logger.info(f"[{self.state.id}] Quantum decision: {options[option_index]} (coherence: {self.state.quantum_coherence:.3f})")
            return options[option_index]
            
        except ImportError:
            # Fallback to classical randomness if Qiskit not available
            import random
            selected = random.choice(options)
            self.state.quantum_coherence = 0.0
            self.state.last_action = f"classical_fallback"
            logger.warning(f"[{self.state.id}] Qiskit unavailable, using classical fallback: {selected}")
            return selected
        except Exception as e:
            logger.error(f"[{self.state.id}] Quantum decision error: {e}")
            return options[0]  # Safe fallback
    
    async def query_memory(self, topic: str, memory_system=None) -> List[str]:
        """
        Query the ChromaDB memory system for relevant information
        """
        if memory_system is None:
            # Fallback to local memory fragments
            relevant = [frag for frag in self.state.memory_fragments if topic.lower() in frag.lower()]
            self.state.last_action = f"memory_query_local_{len(relevant)}_results"
            return relevant
        
        try:
            # Use ChromaDB for semantic search
            results = await memory_system.query(
                query_texts=[topic],
                n_results=5,
                include=['documents', 'metadatas', 'distances']
            )
            
            relevant_memories = []
            if results['documents']:
                for docs in results['documents']:
                    relevant_memories.extend(docs)
            
            self.state.memory_fragments.extend(relevant_memories[:3])  # Keep recent
            self.state.last_action = f"memory_query_vector_{len(relevant_memories)}_results"
            
            logger.info(f"[{self.state.id}] Memory query '{topic}' returned {len(relevant_memories)} results")
            return relevant_memories
            
        except Exception as e:
            logger.error(f"[{self.state.id}] Memory query error: {e}")
            return []
    
    async def collaborate_with(self, other_minion: 'MinionNode', task: str) -> Dict[str, Any]:
        """
        Collaborate with another minion on a task
        """
        collaboration = {
            'timestamp': datetime.now().isoformat(),
            'initiator': self.state.id,
            'collaborator': other_minion.state.id,
            'task': task,
            'initiator_role': self.state.role.value,
            'collaborator_role': other_minion.state.role.value,
            'success': False,
            'output': None
        }
        
        try:
            # Check role compatibility
            compatible_roles = {
                AgentRole.SOLAR_ENGINEER: [AgentRole.PV_DESIGNER, AgentRole.GRID_ANALYST],
                AgentRole.PV_DESIGNER: [AgentRole.SOLAR_ENGINEER, AgentRole.FINANCIAL_ADVISOR],
                AgentRole.GRID_ANALYST: [AgentRole.SOLAR_ENGINEER, AgentRole.WEATHER_ORACLE],
                AgentRole.DATA_PHILOSOPHER: [AgentRole.QUANTUM_NAVIGATOR, AgentRole.COMPLIANCE_OFFICER],
                AgentRole.COMPLIANCE_OFFICER: [AgentRole.DATA_PHILOSOPHER, AgentRole.FINANCIAL_ADVISOR],
                AgentRole.WEATHER_ORACLE: [AgentRole.GRID_ANALYST, AgentRole.PV_DESIGNER],
                AgentRole.FINANCIAL_ADVISOR: [AgentRole.PV_DESIGNER, AgentRole.COMPLIANCE_OFFICER],
                AgentRole.QUANTUM_NAVIGATOR: [AgentRole.DATA_PHILOSOPHER, AgentRole.WEATHER_ORACLE]
            }
            
            if other_minion.state.role in compatible_roles.get(self.state.role, []):
                # Successful collaboration
                self.state.collaboration_score += 1.0
                other_minion.state.collaboration_score += 1.0
                collaboration['success'] = True
                collaboration['output'] = f"Successfully collaborated on {task}"
                
                # Share memory fragments
                shared_memory = f"Collaborated with {other_minion.state.role.value} on {task}"
                self.state.memory_fragments.append(shared_memory)
                other_minion.state.memory_fragments.append(shared_memory)
                
                logger.info(f"[{self.state.id}] Successful collaboration with {other_minion.state.id} on {task}")
            else:
                collaboration['output'] = f"Role incompatibility: {self.state.role.value} + {other_minion.state.role.value}"
                logger.warning(f"[{self.state.id}] Failed collaboration with {other_minion.state.id}: role incompatibility")
            
        except Exception as e:
            collaboration['output'] = f"Collaboration error: {str(e)}"
            logger.error(f"[{self.state.id}] Collaboration error: {e}")
        
        return collaboration

class HiveMind:
    """
    The distributed intelligence coordination system
    Manages multiple minion agents and their interactions
    """
    
    def __init__(self):
        self.epoch = 0
        self.genesis_time = datetime.now()
        self.agents: Dict[str, MinionNode] = {}
        self.collaboration_history = []
        self.quantum_state = "INITIALIZING"
        self.memory_integrity = 100.0
        self.evolution_log = []
        
        # Initialize the agent collective
        self._initialize_agents()
        
    def _initialize_agents(self):
        """Initialize the core agent collective"""
        agent_configs = [
            (AgentRole.SOLAR_ENGINEER, AgentTier.TIER_2_ORCHESTRATORS, ["PySAM", "AutoGen", "Python"]),
            (AgentRole.PV_DESIGNER, AgentTier.TIER_1_TOOLS, ["PySAM", "CAD", "Python"]),
            (AgentRole.GRID_ANALYST, AgentTier.TIER_2_ORCHESTRATORS, ["GridLAB-D", "PySAM", "AutoGen"]),
            (AgentRole.DATA_PHILOSOPHER, AgentTier.TIER_3_SAGES, ["ChromaDB", "Qiskit", "RAG"]),
            (AgentRole.COMPLIANCE_OFFICER, AgentTier.TIER_3_SAGES, ["RAG_AS3000", "ChromaDB", "LegalDB"]),
            (AgentRole.WEATHER_ORACLE, AgentTier.TIER_1_TOOLS, ["Prophet", "WeatherAPI", "Python"]),
            (AgentRole.FINANCIAL_ADVISOR, AgentTier.TIER_1_TOOLS, ["Python", "NPV", "Economics"]),
            (AgentRole.QUANTUM_NAVIGATOR, AgentTier.TIER_2_ORCHESTRATORS, ["Qiskit", "RandomOracle", "Inspiration"])
        ]
        
        for role, tier, tools in agent_configs:
            agent = MinionNode(role, tier, tools)
            self.agents[agent.state.id] = agent
            
        logger.info(f"Initialized {len(self.agents)} agents in the Hive Mind")
        
    async def evolve(self) -> Dict[str, Any]:
        """
        Execute one evolution cycle of the hive mind
        """
        self.epoch += 1
        evolution_start = time.time()
        
        logger.info(f"🧬 EPOCH {self.epoch} | HIVE EVOLUTION CYCLE")
        
        # Stage 1: Agent Activity Updates
        active_agents = [agent for agent in self.agents.values() if agent.state.active]
        
        # Stage 2: Collaboration Network
        collaborations = await self._orchestrate_collaborations(active_agents)
        
        # Stage 3: Quantum Decision Making
        quantum_decisions = await self._quantum_decision_layer(active_agents)
        
        # Stage 4: Memory Consolidation
        memory_updates = await self._consolidate_memory()
        
        # Stage 5: State Persistence
        hive_state = self._generate_state_snapshot()
        
        evolution_time = time.time() - evolution_start
        
        evolution_result = {
            'epoch': self.epoch,
            'evolution_time_ms': evolution_time * 1000,
            'active_agents': len(active_agents),
            'collaborations': len(collaborations),
            'quantum_decisions': len(quantum_decisions),
            'memory_integrity': self.memory_integrity,
            'hive_state': hive_state
        }
        
        self.evolution_log.append(evolution_result)
        
        logger.info(f"Evolution cycle {self.epoch} completed in {evolution_time:.3f}s")
        return evolution_result
        
    async def _orchestrate_collaborations(self, agents: List[MinionNode]) -> List[Dict[str, Any]]:
        """Orchestrate agent collaborations using AutoGen-style patterns"""
        collaborations = []
        
        # Define collaboration tasks
        collaboration_tasks = [
            "solar_yield_analysis",
            "grid_integration_study", 
            "compliance_verification",
            "financial_optimization",
            "weather_impact_modeling",
            "quantum_uncertainty_analysis"
        ]
        
        # Pair compatible agents for collaboration
        for i, agent1 in enumerate(agents):
            for agent2 in agents[i+1:]:
                task = collaboration_tasks[len(collaborations) % len(collaboration_tasks)]
                collaboration = await agent1.collaborate_with(agent2, task)
                collaborations.append(collaboration)
                
                # Limit collaborations per epoch to prevent explosion
                if len(collaborations) >= 5:
                    break
            if len(collaborations) >= 5:
                break
                
        self.collaboration_history.extend(collaborations)
        return collaborations
        
    async def _quantum_decision_layer(self, agents: List[MinionNode]) -> List[Dict[str, Any]]:
        """Apply quantum decision making to agents"""
        quantum_decisions = []
        
        decision_scenarios = [
            ["optimize_for_efficiency", "optimize_for_reliability"],
            ["conservative_approach", "innovative_approach"],
            ["local_optimization", "grid_optimization"],
            ["immediate_action", "strategic_delay"]
        ]
        
        for agent in agents[:3]:  # Limit quantum decisions per epoch
            scenario = decision_scenarios[len(quantum_decisions) % len(decision_scenarios)]
            decision = await agent.run_quantum_decision(scenario)
            
            quantum_decisions.append({
                'agent_id': agent.state.id,
                'agent_role': agent.state.role.value,
                'scenario': scenario,
                'decision': decision,
                'quantum_coherence': agent.state.quantum_coherence,
                'timestamp': datetime.now().isoformat()
            })
            
        return quantum_decisions
        
    async def _consolidate_memory(self) -> Dict[str, Any]:
        """Consolidate and manage collective memory"""
        total_fragments = sum(len(agent.state.memory_fragments) for agent in self.agents.values())
        
        # Simulate memory consolidation (in real implementation, this would use ChromaDB)
        if total_fragments > 1000:
            # Memory cleanup - keep only recent and important fragments
            for agent in self.agents.values():
                if len(agent.state.memory_fragments) > 10:
                    agent.state.memory_fragments = agent.state.memory_fragments[-5:]  # Keep recent
            
            self.memory_integrity = max(80.0, self.memory_integrity - 1.0)
        else:
            self.memory_integrity = min(100.0, self.memory_integrity + 0.1)
            
        return {
            'total_fragments': total_fragments,
            'memory_integrity': self.memory_integrity,
            'cleanup_performed': total_fragments > 1000
        }
        
    def _generate_state_snapshot(self) -> Dict[str, Any]:
        """Generate current hive state snapshot"""
        return {
            'epoch': self.epoch,
            'genesis_time': self.genesis_time.isoformat(),
            'uptime_seconds': (datetime.now() - self.genesis_time).total_seconds(),
            'active_agents': [agent.state.to_dict() for agent in self.agents.values() if agent.state.active],
            'total_collaborations': len(self.collaboration_history),
            'quantum_state': self.quantum_state,
            'memory_integrity': self.memory_integrity,
            'system_status': "OPERATIONAL"
        }
        
    async def save_state_to_file(self, filepath: str = "genesis_state.json"):
        """Save current state to JSON file for LLM consumption"""
        state = self._generate_state_snapshot()
        
        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
            
        logger.info(f"Hive state saved to {filepath}")
        return state
        
    def get_agent_by_role(self, role: AgentRole) -> Optional[MinionNode]:
        """Get agent by role"""
        for agent in self.agents.values():
            if agent.state.role == role:
                return agent
        return None
        
    async def inject_spark(self, agent_id: str, spark_increase: float = 10.0):
        """Inject curiosity spark into specific agent"""
        if agent_id in self.agents:
            self.agents[agent_id].state.spark = min(100.0, self.agents[agent_id].state.spark + spark_increase)
            logger.info(f"Injected {spark_increase} spark into agent {agent_id}")

# Global hive instance
hive_mind = HiveMind()

async def get_hive() -> HiveMind:
    """Get the global hive mind instance"""
    return hive_mind