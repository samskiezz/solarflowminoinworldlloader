"""
PROJECT SOLAR: GENESIS OMEGA - Memory Lattice
ChromaDB Integration for Persistent Agent Memory
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class MemoryFragment:
    """Individual memory fragment with metadata"""
    id: str
    content: str
    agent_id: str
    agent_role: str
    memory_type: str  # 'experience', 'knowledge', 'conversation', 'decision'
    timestamp: datetime
    importance_score: float  # 0.0 to 1.0
    access_count: int
    last_accessed: datetime
    tags: List[str]
    embedding: Optional[List[float]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat(),
            'last_accessed': self.last_accessed.isoformat()
        }

@dataclass 
class MemoryQuery:
    """Query structure for memory retrieval"""
    query_text: str
    agent_id: Optional[str] = None
    memory_types: Optional[List[str]] = None
    time_range: Optional[Tuple[datetime, datetime]] = None
    min_importance: float = 0.0
    max_results: int = 10
    include_embeddings: bool = False

class ChromaMemorySystem:
    """
    Persistent memory system using ChromaDB for semantic search and storage
    Serves as the "Hippocampus" of the autonomous agents
    """
    
    def __init__(self, persist_directory: str = "./genesis_memory"):
        self.persist_directory = Path(persist_directory)
        self.persist_directory.mkdir(exist_ok=True)
        
        self.chroma_available = False
        self.collection = None
        self.client = None
        self.embedding_function = None
        
        self._initialize_chroma()
        
    def _initialize_chroma(self):
        """Initialize ChromaDB client and collection"""
        try:
            import chromadb
            from chromadb.config import Settings
            from chromadb.utils import embedding_functions
            
            # Create persistent client
            self.client = chromadb.PersistentClient(
                path=str(self.persist_directory),
                settings=Settings(anonymized_telemetry=False)
            )
            
            # Set up embedding function
            self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="all-MiniLM-L6-v2"
            )
            
            # Create or get collection
            self.collection = self.client.get_or_create_collection(
                name="genesis_memories",
                embedding_function=self.embedding_function,
                metadata={"description": "Project Solar Genesis Omega agent memories"}
            )
            
            self.chroma_available = True
            logger.info(f"ChromaDB initialized successfully with {self.collection.count()} existing memories")
            
        except ImportError:
            logger.warning("ChromaDB not available - using fallback memory system")
            self.chroma_available = False
            self._initialize_fallback()
            
        except Exception as e:
            logger.error(f"ChromaDB initialization error: {e}")
            self.chroma_available = False
            self._initialize_fallback()
            
    def _initialize_fallback(self):
        """Initialize fallback memory system when ChromaDB unavailable"""
        self.fallback_memories = {}
        self.fallback_embeddings = {}
        
    async def store_memory(self, memory: MemoryFragment) -> bool:
        """Store a memory fragment in the persistent memory system"""
        try:
            if self.chroma_available and self.collection:
                # Store in ChromaDB
                self.collection.add(
                    documents=[memory.content],
                    metadatas=[{
                        'agent_id': memory.agent_id,
                        'agent_role': memory.agent_role,
                        'memory_type': memory.memory_type,
                        'timestamp': memory.timestamp.isoformat(),
                        'importance_score': memory.importance_score,
                        'access_count': memory.access_count,
                        'tags': json.dumps(memory.tags)
                    }],
                    ids=[memory.id]
                )
                
                logger.debug(f"Stored memory {memory.id} for agent {memory.agent_id}")
                return True
                
            else:
                # Fallback storage
                self.fallback_memories[memory.id] = memory
                logger.debug(f"Stored memory {memory.id} in fallback system")
                return True
                
        except Exception as e:
            logger.error(f"Memory storage error: {e}")
            return False
            
    async def query_memories(self, query: MemoryQuery) -> List[MemoryFragment]:
        """Query memories using semantic search"""
        try:
            if self.chroma_available and self.collection:
                return await self._query_chroma(query)
            else:
                return await self._query_fallback(query)
                
        except Exception as e:
            logger.error(f"Memory query error: {e}")
            return []
            
    async def _query_chroma(self, query: MemoryQuery) -> List[MemoryFragment]:
        """Query using ChromaDB semantic search"""
        # Build where clause for filtering
        where_conditions = {}
        
        if query.agent_id:
            where_conditions['agent_id'] = query.agent_id
            
        if query.memory_types:
            where_conditions['memory_type'] = {"$in": query.memory_types}
            
        if query.min_importance > 0:
            where_conditions['importance_score'] = {"$gte": query.min_importance}
            
        # Execute query
        results = self.collection.query(
            query_texts=[query.query_text],
            n_results=query.max_results,
            where=where_conditions if where_conditions else None,
            include=['documents', 'metadatas', 'distances']
        )
        
        # Convert results to MemoryFragment objects
        memories = []
        
        if results['documents'] and len(results['documents']) > 0:
            for i, (doc, metadata, distance) in enumerate(zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            )):
                try:
                    memory = MemoryFragment(
                        id=results['ids'][0][i],
                        content=doc,
                        agent_id=metadata['agent_id'],
                        agent_role=metadata['agent_role'],
                        memory_type=metadata['memory_type'],
                        timestamp=datetime.fromisoformat(metadata['timestamp']),
                        importance_score=metadata['importance_score'],
                        access_count=metadata['access_count'],
                        last_accessed=datetime.now(),
                        tags=json.loads(metadata.get('tags', '[]'))
                    )
                    
                    # Update access count
                    await self._update_access_count(memory.id)
                    
                    memories.append(memory)
                    
                except Exception as e:
                    logger.error(f"Error parsing memory result: {e}")
                    continue
                    
        logger.debug(f"Retrieved {len(memories)} memories for query: {query.query_text}")
        return memories
        
    async def _query_fallback(self, query: MemoryQuery) -> List[MemoryFragment]:
        """Fallback query using simple text search"""
        matching_memories = []
        
        for memory in self.fallback_memories.values():
            # Simple keyword matching
            if query.query_text.lower() in memory.content.lower():
                # Apply filters
                if query.agent_id and memory.agent_id != query.agent_id:
                    continue
                    
                if query.memory_types and memory.memory_type not in query.memory_types:
                    continue
                    
                if memory.importance_score < query.min_importance:
                    continue
                    
                matching_memories.append(memory)
                
        # Sort by importance and recency
        matching_memories.sort(
            key=lambda m: (m.importance_score, m.timestamp),
            reverse=True
        )
        
        return matching_memories[:query.max_results]
        
    async def _update_access_count(self, memory_id: str):
        """Update access count for a memory"""
        try:
            if self.chroma_available and self.collection:
                # ChromaDB doesn't support in-place updates easily
                # In production, would implement proper update mechanism
                pass
            else:
                if memory_id in self.fallback_memories:
                    self.fallback_memories[memory_id].access_count += 1
                    self.fallback_memories[memory_id].last_accessed = datetime.now()
                    
        except Exception as e:
            logger.error(f"Error updating access count: {e}")
            
    async def store_agent_experience(self, 
                                     agent_id: str, 
                                     agent_role: str,
                                     experience_text: str,
                                     experience_type: str = "experience",
                                     importance: float = 0.5,
                                     tags: Optional[List[str]] = None) -> str:
        """Convenience method to store agent experience"""
        
        memory = MemoryFragment(
            id=str(uuid.uuid4()),
            content=experience_text,
            agent_id=agent_id,
            agent_role=agent_role,
            memory_type=experience_type,
            timestamp=datetime.now(),
            importance_score=importance,
            access_count=0,
            last_accessed=datetime.now(),
            tags=tags or []
        )
        
        success = await self.store_memory(memory)
        
        if success:
            logger.info(f"Stored {experience_type} memory for {agent_role} agent {agent_id}")
            return memory.id
        else:
            logger.error(f"Failed to store memory for agent {agent_id}")
            return ""
            
    async def get_agent_memory_summary(self, agent_id: str) -> Dict[str, Any]:
        """Get summary of memories for specific agent"""
        
        query = MemoryQuery(
            query_text="",  # Empty query to get all memories
            agent_id=agent_id,
            max_results=1000
        )
        
        memories = await self.query_memories(query)
        
        # Calculate statistics
        memory_types = {}
        importance_scores = []
        recent_memories = []
        
        cutoff_time = datetime.now() - timedelta(hours=24)
        
        for memory in memories:
            # Count memory types
            memory_types[memory.memory_type] = memory_types.get(memory.memory_type, 0) + 1
            
            # Collect importance scores
            importance_scores.append(memory.importance_score)
            
            # Recent memories
            if memory.timestamp > cutoff_time:
                recent_memories.append(memory)
                
        return {
            'agent_id': agent_id,
            'total_memories': len(memories),
            'memory_types': memory_types,
            'avg_importance': sum(importance_scores) / len(importance_scores) if importance_scores else 0.0,
            'recent_memories_24h': len(recent_memories),
            'oldest_memory': min(memories, key=lambda m: m.timestamp).timestamp.isoformat() if memories else None,
            'newest_memory': max(memories, key=lambda m: m.timestamp).timestamp.isoformat() if memories else None
        }
        
    async def consolidate_memories(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Consolidate and compress old memories to prevent information overload
        Similar to human memory consolidation during sleep
        """
        consolidation_stats = {
            'processed_memories': 0,
            'consolidated_memories': 0,
            'freed_space': 0
        }
        
        try:
            # Define consolidation criteria
            old_threshold = datetime.now() - timedelta(days=30)
            low_importance_threshold = 0.3
            low_access_threshold = 2
            
            # Query memories for consolidation
            query = MemoryQuery(
                query_text="",
                agent_id=agent_id,
                max_results=1000
            )
            
            memories = await self.query_memories(query)
            consolidation_stats['processed_memories'] = len(memories)
            
            # Group similar memories for consolidation
            consolidation_groups = {}
            
            for memory in memories:
                # Skip recent or important memories
                if (memory.timestamp > old_threshold or 
                    memory.importance_score > low_importance_threshold or
                    memory.access_count > low_access_threshold):
                    continue
                    
                # Group by similarity (simplified - would use embeddings in production)
                key = f"{memory.agent_role}_{memory.memory_type}"
                if key not in consolidation_groups:
                    consolidation_groups[key] = []
                consolidation_groups[key].append(memory)
                
            # Consolidate groups
            for group_key, group_memories in consolidation_groups.items():
                if len(group_memories) > 3:  # Only consolidate if enough memories
                    
                    # Create consolidated memory
                    consolidated_content = f"Consolidated {len(group_memories)} experiences: "
                    consolidated_content += "; ".join([m.content[:50] + "..." for m in group_memories[:3]])
                    
                    # Use the most important memory as base
                    base_memory = max(group_memories, key=lambda m: m.importance_score)
                    
                    consolidated_memory = MemoryFragment(
                        id=str(uuid.uuid4()),
                        content=consolidated_content,
                        agent_id=base_memory.agent_id,
                        agent_role=base_memory.agent_role,
                        memory_type="consolidated_" + base_memory.memory_type,
                        timestamp=datetime.now(),
                        importance_score=min(0.8, max(m.importance_score for m in group_memories)),
                        access_count=0,
                        last_accessed=datetime.now(),
                        tags=list(set([tag for m in group_memories for tag in m.tags]))
                    )
                    
                    # Store consolidated memory
                    await self.store_memory(consolidated_memory)
                    
                    # Remove original memories (in production, would batch this)
                    for memory in group_memories:
                        await self._delete_memory(memory.id)
                        
                    consolidation_stats['consolidated_memories'] += len(group_memories)
                    
            logger.info(f"Memory consolidation completed: {consolidation_stats}")
            return consolidation_stats
            
        except Exception as e:
            logger.error(f"Memory consolidation error: {e}")
            return consolidation_stats
            
    async def _delete_memory(self, memory_id: str):
        """Delete a memory from storage"""
        try:
            if self.chroma_available and self.collection:
                self.collection.delete(ids=[memory_id])
            else:
                if memory_id in self.fallback_memories:
                    del self.fallback_memories[memory_id]
                    
        except Exception as e:
            logger.error(f"Error deleting memory {memory_id}: {e}")
            
    async def export_memories(self, filepath: str, agent_id: Optional[str] = None) -> bool:
        """Export memories to JSON file"""
        try:
            query = MemoryQuery(
                query_text="",
                agent_id=agent_id,
                max_results=10000
            )
            
            memories = await self.query_memories(query)
            
            export_data = {
                'export_timestamp': datetime.now().isoformat(),
                'agent_id': agent_id,
                'memory_count': len(memories),
                'memories': [memory.to_dict() for memory in memories]
            }
            
            with open(filepath, 'w') as f:
                json.dump(export_data, f, indent=2)
                
            logger.info(f"Exported {len(memories)} memories to {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Memory export error: {e}")
            return False
            
    async def get_memory_statistics(self) -> Dict[str, Any]:
        """Get overall memory system statistics"""
        try:
            if self.chroma_available and self.collection:
                total_count = self.collection.count()
            else:
                total_count = len(self.fallback_memories)
                
            # Get sample of memories for analysis
            query = MemoryQuery(query_text="", max_results=1000)
            sample_memories = await self.query_memories(query)
            
            stats = {
                'total_memories': total_count,
                'sample_size': len(sample_memories),
                'memory_types': {},
                'agents': {},
                'avg_importance': 0.0,
                'storage_backend': 'ChromaDB' if self.chroma_available else 'Fallback'
            }
            
            if sample_memories:
                importance_scores = []
                
                for memory in sample_memories:
                    # Count memory types
                    stats['memory_types'][memory.memory_type] = stats['memory_types'].get(memory.memory_type, 0) + 1
                    
                    # Count agents
                    stats['agents'][memory.agent_id] = stats['agents'].get(memory.agent_id, 0) + 1
                    
                    # Collect importance
                    importance_scores.append(memory.importance_score)
                    
                stats['avg_importance'] = sum(importance_scores) / len(importance_scores)
                
            return stats
            
        except Exception as e:
            logger.error(f"Error getting memory statistics: {e}")
            return {'error': str(e)}

# Global memory system instance
memory_system = ChromaMemorySystem()

async def get_memory_system() -> ChromaMemorySystem:
    """Get the global memory system instance"""
    return memory_system