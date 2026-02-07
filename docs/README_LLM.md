# 🤖 SolarFlow LLM Integration Guide

Complete guide to setting up and using the AI-powered minion chat system in SolarFlow.

## 🎯 **Overview**

SolarFlow includes a sophisticated LLM integration that enables:
- **💬 Real-time chat** with 6 specialist minions
- **🧠 AI-powered consciousness** evolution in autonomous world
- **📊 Intelligent event generation** based on system state
- **🤝 Group minion discussions** for complex problem-solving

## 🔧 **Setup Guide**

### **Step 1: Get an OpenAI API Key**

1. **Visit:** https://platform.openai.com/api-keys
2. **Sign in** or create an OpenAI account
3. **Create new API key** - give it a descriptive name like "SolarFlow"
4. **Copy the key** - starts with `sk-` followed by characters
5. **Add billing** if you haven't already (required for API access)

### **Step 2: Configure SolarFlow**

**Option A: Via Web Interface (Recommended)**
1. Open SolarFlow in your browser
2. Look for the **🤖 LLM Config** button (bottom-left corner)
3. Click it to open the configuration modal
4. Paste your API key in the "OpenAI API Key" field
5. Click **"Save"** 
6. Test with **"Test Chat"** button

**Option B: Direct Configuration**
```javascript
// In browser console or configuration
localStorage.setItem('llm_api_key', 'your-openai-api-key-here');
window.location.reload();
```

### **Step 3: Verify Setup**

1. Click on any minion in the roster
2. Look for **"💬 Chat with [MinionName]"** button in the detail modal
3. Click it to start chatting
4. If working, you'll see a chat interface with conversation history

## 👥 **Meet Your Minion Specialists**

### **🔧 ATLAS - Solar Installation Specialist**
- **Expertise:** AS/NZS 3000:2018, electrical safety, grid connection
- **Personality:** Methodical, safety-focused, technical precision
- **Best for:** Installation questions, electrical standards, safety protocols

### **📊 LUMEN - Energy Systems Analyst** 
- **Expertise:** Performance optimization, energy production, AS/NZS 4777
- **Personality:** Data-driven, analytical, efficiency-focused
- **Best for:** System performance, optimization strategies, data analysis

### **📋 ORBIT - Field Operations Coordinator**
- **Expertise:** Project management, resource allocation, work coordination
- **Personality:** Practical, organized, team-focused
- **Best for:** Project planning, team coordination, operational efficiency

### **📖 PRISM - Compliance & Documentation Expert**
- **Expertise:** AS/NZS compliance, documentation, permit processes
- **Personality:** Detail-oriented, regulation-focused, quality assurance
- **Best for:** Compliance questions, documentation requirements, quality standards

### **🔬 NOVA - Innovation & Research Specialist**
- **Expertise:** New technologies, research, future solar trends
- **Personality:** Creative, forward-thinking, technology enthusiast  
- **Best for:** Latest technologies, innovation ideas, future planning

### **⚙️ BOLT - Maintenance & Troubleshooting Expert**
- **Expertise:** System maintenance, troubleshooting, repairs
- **Personality:** Problem-solver, hands-on, experienced
- **Best for:** Troubleshooting issues, maintenance schedules, repair guidance

## 💬 **Using Minion Chat**

### **Starting a Conversation**

1. **Navigate to minion roster** or any interface showing minions
2. **Click on a minion** name/avatar to open their detail modal
3. **Click "💬 Chat with [MinionName]"** button
4. **Start typing** your question or message

### **Example Conversations**

**With ATLAS (Installation Specialist):**
```
You: What are the AS/NZS 3000 requirements for solar installations?
ATLAS: AS/NZS 3000:2018 specifies several critical requirements for solar installations. Key points include minimum 50mm clearance from electrical equipment, proper earthing systems, and DC isolator placement within 600mm of the array. All circuits must have appropriate overcurrent protection, and installation must comply with Section 5.3 for solar photovoltaic systems...
```

**With LUMEN (Energy Analyst):**
```
You: How can I optimize the performance of a 100kW solar system?
LUMEN: Excellent question! For a 100kW system, I'd recommend focusing on these optimization strategies: 1) Panel orientation analysis - ensure panels face true north with optimal tilt angle (typically 20-30° in Australia), 2) Monitoring string performance individually to identify underperforming sections, 3) Regular cleaning schedule as even 5% soiling can reduce output by 10-15%...
```

### **Advanced Chat Features**

**Context Awareness:**
- Minions know about your current system state
- They reference real data from your activities and minions
- Conversation history persists across sessions

**Group Discussions:**
- Use the autonomous world "Minion Council" button
- Multiple minions discuss complex topics together
- AI facilitates realistic group problem-solving

**Fallback Mode:**
- Works even without API key (basic responses)
- Provides helpful information about solar topics
- Graceful degradation when API unavailable

## 🌍 **Autonomous World AI Features**

### **AI-Powered Events**

When LLM is enabled, the autonomous world generates intelligent events:

```javascript
// Example AI-generated events
"🧠 Consciousness breakthrough: Minions develop new solar optimization algorithm"
"⚡ Energy efficiency discovery: AI entities find 15% improvement in battery storage"  
"🤝 Collaborative innovation: Minion team designs next-generation solar tracking system"
```

### **Enhanced Consciousness Evolution**

- **AI insights** drive consciousness development
- **Realistic progression** based on system state
- **Contextual events** that make sense for solar civilization

### **Intelligent Minion Interactions**

- **Group problem-solving** for technical challenges
- **Knowledge sharing** between specialist minions
- **Realistic personalities** in group discussions

## 🔧 **Technical Configuration**

### **Configuration Options**

```json
{
  "llm": {
    "provider": "openai",
    "baseURL": "https://api.openai.com/v1",
    "model": "gpt-4",
    "maxTokens": 800,
    "temperature": 0.7,
    "rateLimitMs": 2000
  }
}
```

### **Environment Variables**

```bash
# Optional: Set via environment variables
export OPENAI_API_KEY="your-key-here"
export LLM_MODEL="gpt-4"
export LLM_MAX_TOKENS="800"
```

### **Rate Limiting**

- **Built-in rate limiting:** 2 seconds between requests
- **Queue management:** Requests queued when rate limited
- **Error handling:** Graceful fallbacks on API errors

## 📊 **Monitoring & Analytics**

### **Usage Tracking**

The system tracks:
- **Conversation count** per minion
- **API usage** and token consumption  
- **Response times** and success rates
- **Error rates** and fallback usage

### **Performance Monitoring**

```javascript
// Check LLM status
window.globalLLM.getConfiguration()

// View conversation stats
console.log('Conversations:', window.globalLLM.conversationHistory.size);
```

## 🔒 **Security & Privacy**

### **API Key Security**
- Stored locally in browser localStorage
- Never transmitted in logs or exported data
- Only used for direct API communication

### **Conversation Privacy**
- Conversations stored locally only
- No data sent to external services (except OpenAI API)
- Can be cleared via browser storage settings

### **Data Handling**
- System context shared with AI is limited to:
  - Current system metrics
  - Minion roster information  
  - Activity summaries (no personal data)

## 🚨 **Troubleshooting**

### **Common Issues**

**"LLM: OFFLINE" Status:**
- Check API key is correctly entered
- Verify OpenAI account has billing enabled
- Check browser console for error messages

**Chat Button Missing:**
- Ensure LLM integration scripts are loaded
- Check for JavaScript errors in console
- Refresh page and try again

**Slow Responses:**
- Rate limiting in effect (wait 2 seconds between requests)
- OpenAI API may be experiencing delays
- Check internet connection

**API Errors:**
```javascript
// Check for errors in browser console
window.globalLLM.chatWithMinion('ATLAS', 'test message')
  .then(response => console.log(response))
  .catch(error => console.error(error));
```

### **Error Messages**

| Error | Cause | Solution |
|-------|-------|----------|
| "API key required" | No API key configured | Add API key via 🤖 LLM Config |
| "Rate limit exceeded" | Too many requests | Wait 2 seconds between requests |
| "Invalid API key" | Wrong or expired key | Verify key at OpenAI platform |
| "Insufficient quota" | API usage limit reached | Check OpenAI billing/usage |

## 🎛️ **Advanced Configuration**

### **Custom Model Settings**

```javascript
// Modify configuration (advanced users)
window.globalLLM.model = 'gpt-3.5-turbo';
window.globalLLM.temperature = 0.5;
window.globalLLM.rateLimitMs = 1000;
```

### **Alternative Providers**

While designed for OpenAI, the system can potentially work with other OpenAI-compatible APIs:

```javascript
// Example: Custom endpoint
window.globalLLM.baseURL = 'https://your-custom-api.com/v1';
window.globalLLM.model = 'your-custom-model';
```

## 📈 **Best Practices**

### **Optimal Usage**
- **Be specific** in questions for better responses
- **Ask follow-up questions** to dive deeper into topics
- **Use appropriate minions** for different expertise areas
- **Save important insights** from conversations

### **Cost Management**
- Monitor usage on OpenAI dashboard
- Use shorter questions when possible
- Take advantage of conversation context
- Set monthly usage alerts in OpenAI account

### **Conversation Tips**
- Start with specific technical questions
- Reference AS/NZS standards by number
- Ask for step-by-step procedures
- Request clarification when needed

## 🔄 **Updates & Maintenance**

### **Keeping LLM Integration Updated**

The LLM system updates automatically with SolarFlow updates. To check for updates:

```javascript
// Check current version
console.log('LLM System Version:', window.globalLLM.version);
```

### **Clearing Conversation History**

```javascript
// Clear all conversations (if needed)
window.globalLLM.conversationHistory.clear();
window.globalLLM.saveConversationHistory();
```

## 📞 **Support**

For LLM-related issues:

1. **Check configuration** via 🤖 LLM Config button
2. **Verify API key** is valid and has billing enabled
3. **Check browser console** for error messages
4. **Test with different minions** to isolate issues
5. **Create GitHub issue** with error logs if needed

## ✅ **LLM Setup Checklist**

- [ ] OpenAI account created
- [ ] API key generated
- [ ] Billing method added to OpenAI account
- [ ] API key added to SolarFlow via 🤖 LLM Config
- [ ] Test chat successful with at least one minion
- [ ] Chat buttons appear in minion detail modals
- [ ] Conversation history persists across browser sessions
- [ ] Autonomous world shows enhanced AI events
- [ ] Status indicator shows "LLM: ONLINE"

Once complete, you'll have access to intelligent conversations with solar specialist minions and AI-enhanced autonomous world features!