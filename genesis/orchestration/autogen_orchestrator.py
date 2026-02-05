"""
PROJECT SOLAR: GENESIS OMEGA - Orchestration Layer
Microsoft AutoGen Integration for Multi-Agent Collaboration
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ConversationState(Enum):
    """States of agent conversations"""
    INITIATED = "initiated"
    IN_PROGRESS = "in_progress"
    AWAITING_RESPONSE = "awaiting_response"
    COMPLETED = "completed"
    TERMINATED = "terminated"
    ERROR = "error"

@dataclass
class Message:
    """Message structure for agent communication"""
    id: str
    sender_id: str
    receiver_id: str
    content: str
    message_type: str  # 'request', 'response', 'notification', 'task_handoff'
    timestamp: datetime
    conversation_id: str
    metadata: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': self.content,
            'message_type': self.message_type,
            'timestamp': self.timestamp.isoformat(),
            'conversation_id': self.conversation_id,
            'metadata': self.metadata
        }

@dataclass
class Conversation:
    """Conversation thread between agents"""
    id: str
    participants: List[str]
    topic: str
    state: ConversationState
    messages: List[Message]
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any]
    
class AutoGenOrchestrator:
    """
    Multi-agent orchestration using AutoGen patterns
    Enables autonomous collaboration between specialized agents
    """
    
    def __init__(self):
        self.autogen_available = False
        self.conversations: Dict[str, Conversation] = {}
        self.active_agents: Dict[str, Any] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.collaboration_patterns: Dict[str, Dict] = {}
        
        self._initialize_autogen()
        self._setup_collaboration_patterns()
        
    def _initialize_autogen(self):
        """Initialize AutoGen components"""
        try:
            import autogen
            from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
            
            self.autogen = autogen
            self.AssistantAgent = AssistantAgent
            self.UserProxyAgent = UserProxyAgent
            self.GroupChat = GroupChat
            self.GroupChatManager = GroupChatManager
            
            self.autogen_available = True
            logger.info("AutoGen successfully initialized")
            
        except ImportError:
            logger.warning("AutoGen not available - using fallback orchestration")
            self.autogen_available = False
            self._initialize_fallback()
            
    def _initialize_fallback(self):
        """Initialize fallback orchestration when AutoGen unavailable"""
        # Create simple message passing system
        self.message_queue = asyncio.Queue()
        
    def _setup_collaboration_patterns(self):
        """Define collaboration patterns between different agent roles"""
        
        self.collaboration_patterns = {
            'solar_design_review': {
                'description': 'Review solar system design for technical and financial viability',
                'participants': ['Solar_Engineer', 'Financial_Advisor', 'Compliance_Officer'],
                'workflow': [
                    {'role': 'Solar_Engineer', 'task': 'initial_design', 'outputs': ['system_specs']},
                    {'role': 'Financial_Advisor', 'task': 'financial_analysis', 'inputs': ['system_specs'], 'outputs': ['financial_model']},
                    {'role': 'Compliance_Officer', 'task': 'code_compliance', 'inputs': ['system_specs'], 'outputs': ['compliance_report']},
                    {'role': 'Solar_Engineer', 'task': 'design_refinement', 'inputs': ['financial_model', 'compliance_report']}
                ]
            },
            
            'grid_integration_study': {
                'description': 'Analyze grid integration requirements and impacts',
                'participants': ['Grid_Analyst', 'Weather_Oracle', 'Data_Philosopher'],
                'workflow': [
                    {'role': 'Weather_Oracle', 'task': 'generation_forecast', 'outputs': ['weather_forecast']},
                    {'role': 'Grid_Analyst', 'task': 'grid_impact_analysis', 'inputs': ['weather_forecast'], 'outputs': ['grid_study']},
                    {'role': 'Data_Philosopher', 'task': 'uncertainty_analysis', 'inputs': ['grid_study'], 'outputs': ['risk_assessment']}
                ]
            },
            
            'system_optimization': {
                'description': 'Optimize system performance using quantum-enhanced decision making',
                'participants': ['PV_Designer', 'Quantum_Navigator', 'Data_Philosopher'],
                'workflow': [
                    {'role': 'PV_Designer', 'task': 'performance_analysis', 'outputs': ['performance_data']},
                    {'role': 'Quantum_Navigator', 'task': 'optimization_scenarios', 'inputs': ['performance_data'], 'outputs': ['quantum_scenarios']},
                    {'role': 'Data_Philosopher', 'task': 'scenario_evaluation', 'inputs': ['quantum_scenarios'], 'outputs': ['recommendations']}
                ]
            }
        }
        
    async def create_agent(self, 
                           agent_id: str, 
                           role: str, 
                           system_message: str,
                           tools: Optional[List[str]] = None) -> bool:
        """Create a new agent in the orchestration system"""
        
        try:
            if self.autogen_available:
                # Create AutoGen agent
                if role == "UserProxy":
                    agent = self.UserProxyAgent(
                        name=agent_id,
                        human_input_mode="NEVER",
                        max_consecutive_auto_reply=10,
                        is_termination_msg=lambda x: x.get("content", "").rstrip().endswith("TERMINATE"),
                        code_execution_config={
                            "work_dir": f"./agent_workspace/{agent_id}",
                            "use_docker": False,
                        }
                    )
                else:
                    agent = self.AssistantAgent(
                        name=agent_id,
                        system_message=system_message,
                        llm_config={
                            "config_list": [{"model": "gpt-3.5-turbo", "api_key": "placeholder"}],
                            "temperature": 0.7
                        }
                    )
                    
                self.active_agents[agent_id] = {
                    'agent': agent,
                    'role': role,
                    'tools': tools or [],
                    'created_at': datetime.now(),
                    'message_count': 0
                }
                
            else:
                # Fallback agent representation
                self.active_agents[agent_id] = {
                    'agent_id': agent_id,
                    'role': role,
                    'system_message': system_message,
                    'tools': tools or [],
                    'created_at': datetime.now(),
                    'message_count': 0,
                    'fallback': True
                }
                
            logger.info(f"Created agent {agent_id} with role {role}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating agent {agent_id}: {e}")
            return False
            
    async def initiate_collaboration(self, 
                                     pattern_name: str, 
                                     context: Dict[str, Any]) -> str:
        """Initiate a collaboration pattern between agents"""
        
        if pattern_name not in self.collaboration_patterns:
            logger.error(f"Unknown collaboration pattern: {pattern_name}")
            return ""
            
        pattern = self.collaboration_patterns[pattern_name]
        conversation_id = str(uuid.uuid4())
        
        # Create conversation
        conversation = Conversation(
            id=conversation_id,
            participants=pattern['participants'],
            topic=pattern['description'],
            state=ConversationState.INITIATED,
            messages=[],
            created_at=datetime.now(),
            updated_at=datetime.now(),
            metadata={
                'pattern': pattern_name,
                'context': context,
                'workflow_step': 0
            }
        )
        
        self.conversations[conversation_id] = conversation
        
        try:
            if self.autogen_available:
                await self._execute_autogen_collaboration(conversation, pattern, context)
            else:
                await self._execute_fallback_collaboration(conversation, pattern, context)
                
            logger.info(f"Initiated collaboration {conversation_id} using pattern {pattern_name}")
            return conversation_id
            
        except Exception as e:
            logger.error(f"Error initiating collaboration: {e}")
            conversation.state = ConversationState.ERROR
            return conversation_id
            
    async def _execute_autogen_collaboration(self, 
                                             conversation: Conversation, 
                                             pattern: Dict, 
                                             context: Dict[str, Any]):
        """Execute collaboration using AutoGen group chat"""
        
        # Get participating agents
        participant_agents = []
        for participant_role in pattern['participants']:
            # Find agent with matching role
            agent_entry = None
            for agent_id, agent_info in self.active_agents.items():
                if agent_info['role'] == participant_role:
                    agent_entry = agent_info
                    break
                    
            if agent_entry and 'agent' in agent_entry:
                participant_agents.append(agent_entry['agent'])
                
        if len(participant_agents) < 2:
            logger.error(f"Insufficient agents for collaboration: need {len(pattern['participants'])}, have {len(participant_agents)}")
            conversation.state = ConversationState.ERROR
            return
            
        try:
            # Create group chat
            group_chat = self.GroupChat(
                agents=participant_agents,
                messages=[],
                max_round=20
            )
            
            # Create group chat manager
            manager = self.GroupChatManager(
                groupchat=group_chat,
                llm_config={
                    "config_list": [{"model": "gpt-3.5-turbo", "api_key": "placeholder"}],
                    "temperature": 0.1
                }
            )
            
            # Initial message to start collaboration
            initial_message = f\"\"\"Starting collaboration: {pattern['description']}
            
Context: {json.dumps(context, indent=2)}

Workflow steps:
{json.dumps(pattern['workflow'], indent=2)}

Please proceed with your assigned tasks in the specified order.
\"\"\"
            
            # Start the conversation
            conversation.state = ConversationState.IN_PROGRESS
            
            # In a real implementation, this would be async
            # For now, we simulate the conversation
            await self._simulate_group_conversation(conversation, pattern, context)
            
        except Exception as e:
            logger.error(f"AutoGen collaboration error: {e}")
            conversation.state = ConversationState.ERROR
            
    async def _execute_fallback_collaboration(self, 
                                              conversation: Conversation, 
                                              pattern: Dict, 
                                              context: Dict[str, Any]):
        """Execute collaboration using fallback message passing"""
        
        conversation.state = ConversationState.IN_PROGRESS
        
        try:
            # Execute workflow steps sequentially
            workflow_outputs = {}
            
            for step_idx, step in enumerate(pattern['workflow']):
                conversation.metadata['workflow_step'] = step_idx
                
                # Prepare inputs for this step
                step_inputs = {}
                if 'inputs' in step:
                    for input_name in step['inputs']:
                        if input_name in workflow_outputs:
                            step_inputs[input_name] = workflow_outputs[input_name]
                        elif input_name in context:
                            step_inputs[input_name] = context[input_name]
                            
                # Execute step
                step_result = await self._execute_workflow_step(
                    conversation.id,
                    step['role'],
                    step['task'],
                    step_inputs,
                    context
                )
                
                # Store outputs
                if 'outputs' in step:
                    for output_name in step['outputs']:
                        workflow_outputs[output_name] = step_result.get(output_name, f"Result from {step['task']}")
                        
                # Add message to conversation
                message = Message(
                    id=str(uuid.uuid4()),
                    sender_id=f"agent_{step['role']}",
                    receiver_id="workflow",
                    content=f"Completed {step['task']}: {json.dumps(step_result, indent=2)}",
                    message_type="task_completion",
                    timestamp=datetime.now(),
                    conversation_id=conversation.id,
                    metadata=step
                )
                
                conversation.messages.append(message)
                conversation.updated_at = datetime.now()
                
            conversation.state = ConversationState.COMPLETED
            conversation.metadata['final_outputs'] = workflow_outputs
            
            logger.info(f"Completed fallback collaboration {conversation.id}")
            
        except Exception as e:
            logger.error(f"Fallback collaboration error: {e}")
            conversation.state = ConversationState.ERROR
            
    async def _execute_workflow_step(self, 
                                     conversation_id: str,
                                     role: str, 
                                     task: str, 
                                     inputs: Dict[str, Any], 
                                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single workflow step"""
        
        # Simulate task execution based on role and task type
        result = {
            'task': task,
            'role': role,
            'timestamp': datetime.now().isoformat(),
            'status': 'completed'
        }
        
        # Role-specific task execution simulation
        if role == 'Solar_Engineer':
            if task == 'initial_design':
                result.update({
                    'system_capacity_kw': 10.5,
                    'panel_count': 30,
                    'inverter_type': 'string',
                    'estimated_yield_kwh': 15000
                })
            elif task == 'design_refinement':
                result.update({
                    'refined_capacity_kw': 11.2,
                    'cost_optimized': True,
                    'compliance_verified': True
                })
                
        elif role == 'Financial_Advisor':
            if task == 'financial_analysis':
                result.update({
                    'total_cost': 25000,
                    'payback_period': 7.2,
                    'roi_percent': 14.5,
                    'financing_options': ['cash', 'loan', 'lease']
                })
                
        elif role == 'Compliance_Officer':
            if task == 'code_compliance':
                result.update({
                    'building_code_status': 'compliant',
                    'electrical_code_status': 'compliant',
                    'permit_requirements': ['electrical', 'building'],
                    'inspection_schedule': 'standard'
                })
                
        elif role == 'Grid_Analyst':
            if task == 'grid_impact_analysis':
                result.update({
                    'grid_capacity_available': True,
                    'voltage_impact': 'minimal',
                    'interconnection_cost': 1500,
                    'utility_requirements': ['net_metering_agreement']
                })
                
        elif role == 'Weather_Oracle':
            if task == 'generation_forecast':
                result.update({
                    'annual_irradiance_kwh_m2': 1650,
                    'seasonal_variation': 0.25,
                    'cloud_coverage_avg': 0.35,
                    'weather_risk_factors': ['occasional_snow', 'dust_storms']
                })
                
        elif role == 'Data_Philosopher':
            if task == 'uncertainty_analysis':
                result.update({
                    'confidence_interval': [0.85, 1.15],
                    'risk_factors': ['weather', 'equipment', 'regulatory'],
                    'sensitivity_analysis': {'irradiance': 0.8, 'temperature': 0.3}
                })
            elif task == 'scenario_evaluation':
                result.update({
                    'recommended_scenario': 'balanced_optimization',
                    'risk_adjusted_return': 12.1,
                    'uncertainty_bounds': [10.5, 18.2]
                })
                
        elif role == 'Quantum_Navigator':
            if task == 'optimization_scenarios':
                result.update({
                    'scenario_count': 8,
                    'quantum_coherence': 0.73,
                    'pareto_optimal_solutions': 3,
                    'recommended_exploration': ['tilt_optimization', 'azimuth_adjustment']
                })
                
        # Add artificial processing delay for realism
        await asyncio.sleep(0.5)
        
        return result
        
    async def _simulate_group_conversation(self, 
                                           conversation: Conversation, 
                                           pattern: Dict, 
                                           context: Dict[str, Any]):
        """Simulate AutoGen group conversation"""
        
        # Create simulated messages between agents
        participants = pattern['participants']
        
        for step_idx, step in enumerate(pattern['workflow']):
            # Agent announces task start
            start_message = Message(
                id=str(uuid.uuid4()),
                sender_id=f"agent_{step['role']}",
                receiver_id="group",
                content=f"Starting {step['task']} with inputs: {step.get('inputs', [])}",
                message_type="task_announcement",
                timestamp=datetime.now(),
                conversation_id=conversation.id,
                metadata=step
            )
            conversation.messages.append(start_message)
            
            # Execute the step
            step_result = await self._execute_workflow_step(
                conversation.id, step['role'], step['task'], {}, context
            )
            
            # Agent reports completion
            completion_message = Message(
                id=str(uuid.uuid4()),
                sender_id=f"agent_{step['role']}",
                receiver_id="group",
                content=f"Completed {step['task']}. Results: {json.dumps(step_result, indent=2)}",
                message_type="task_completion",
                timestamp=datetime.now(),
                conversation_id=conversation.id,
                metadata={'step_result': step_result}
            )
            conversation.messages.append(completion_message)
            
            # Other agents may respond
            for participant in participants:
                if participant != step['role'] and len(conversation.messages) < 15:  # Limit message explosion
                    response_message = Message(
                        id=str(uuid.uuid4()),
                        sender_id=f"agent_{participant}",
                        receiver_id=f"agent_{step['role']}",
                        content=f"Acknowledged completion of {step['task']}. Results look good from {participant} perspective.",
                        message_type="acknowledgment",
                        timestamp=datetime.now(),
                        conversation_id=conversation.id,
                        metadata={'responding_to': step['task']}
                    )
                    conversation.messages.append(response_message)
                    
            conversation.updated_at = datetime.now()
            await asyncio.sleep(0.2)  # Simulate conversation timing
            
        conversation.state = ConversationState.COMPLETED
        
    async def get_conversation_status(self, conversation_id: str) -> Optional[Dict[str, Any]]:
        """Get status of an ongoing conversation"""
        
        if conversation_id not in self.conversations:
            return None
            
        conversation = self.conversations[conversation_id]
        
        return {
            'conversation_id': conversation_id,
            'participants': conversation.participants,
            'topic': conversation.topic,
            'state': conversation.state.value,
            'message_count': len(conversation.messages),
            'created_at': conversation.created_at.isoformat(),
            'updated_at': conversation.updated_at.isoformat(),
            'workflow_step': conversation.metadata.get('workflow_step', 0),
            'final_outputs': conversation.metadata.get('final_outputs', {})
        }
        
    async def get_recent_conversations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversations"""
        
        sorted_conversations = sorted(
            self.conversations.values(),
            key=lambda c: c.updated_at,
            reverse=True
        )
        
        return [
            {
                'conversation_id': conv.id,
                'participants': conv.participants,
                'topic': conv.topic,
                'state': conv.state.value,
                'message_count': len(conv.messages),
                'updated_at': conv.updated_at.isoformat()
            }
            for conv in sorted_conversations[:limit]
        ]
        
    async def send_direct_message(self, 
                                  sender_id: str, 
                                  receiver_id: str, 
                                  content: str, 
                                  message_type: str = "direct") -> str:
        """Send direct message between agents"""
        
        message_id = str(uuid.uuid4())
        conversation_id = f"direct_{sender_id}_{receiver_id}_{int(datetime.now().timestamp())}"
        
        message = Message(
            id=message_id,
            sender_id=sender_id,
            receiver_id=receiver_id,
            content=content,
            message_type=message_type,
            timestamp=datetime.now(),
            conversation_id=conversation_id,
            metadata={'direct_message': True}
        )
        
        # Store in a direct conversation if it doesn't exist
        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = Conversation(
                id=conversation_id,
                participants=[sender_id, receiver_id],
                topic="Direct conversation",
                state=ConversationState.IN_PROGRESS,
                messages=[],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                metadata={'type': 'direct'}
            )
            
        self.conversations[conversation_id].messages.append(message)
        self.conversations[conversation_id].updated_at = datetime.now()
        
        logger.info(f"Direct message sent from {sender_id} to {receiver_id}")
        return message_id
        
    async def get_orchestration_stats(self) -> Dict[str, Any]:
        """Get orchestration system statistics"""
        
        active_conversations = sum(1 for c in self.conversations.values() if c.state == ConversationState.IN_PROGRESS)
        completed_conversations = sum(1 for c in self.conversations.values() if c.state == ConversationState.COMPLETED)
        
        return {
            'backend': 'AutoGen' if self.autogen_available else 'Fallback',
            'total_agents': len(self.active_agents),
            'total_conversations': len(self.conversations),
            'active_conversations': active_conversations,
            'completed_conversations': completed_conversations,
            'collaboration_patterns': len(self.collaboration_patterns),
            'available_patterns': list(self.collaboration_patterns.keys())
        }

# Global orchestrator instance
orchestrator = AutoGenOrchestrator()

async def get_orchestrator() -> AutoGenOrchestrator:
    """Get the global orchestrator instance"""
    return orchestrator