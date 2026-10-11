/**
 * Behaviour mapping (pure): what a simulated agent is doing right now → where
 * in the town it should be, what animation plays, and what it says.
 */
import { SPOTS, lotForJob, landmark } from './town.js';

export const ACTIVITY_ANIM = { work: 'work', rest: 'sleep', break: 'sit', study: 'read', social: 'talk', inspect: 'look', walk: 'walk', idle: 'idle', mentor: 'talk', reflect: 'idle', deep_work: 'read', praise: 'talk' };

/** Last self-chosen action id from the agent log (e.g. 'rest', 'study'). */
export function lastAction(agent) {
    for (let i = (agent.log || []).length - 1; i >= 0; i--) {
        const e = (agent.log[i].events || []).find((x) => x.type === 'action' || x.type === 'work');
        if (e) return e.type === 'work' ? 'work' : e.action;
    }
    return 'idle';
}

/** Where should this agent be? Returns { place, spotKey, index, position, activity, inside, jobId }. */
export function placeFor(agent, { jobs = [], index = 0, hourOfDay = 12 } = {}) {
    const task = agent.currentTask;
    if (task && task.jobId && agent.needs.energy > 15) {
        const lot = lotForJob(jobs, task.jobId);
        if (lot) return { place: 'house', jobId: task.jobId, position: { x: lot.x, z: lot.z + (lot.facing === 0 ? 6 : lot.facing === Math.PI ? -6 : 0) + (lot.facing === 0 || lot.facing === Math.PI ? 0 : 0), ...(Math.abs(lot.facing) === Math.PI / 2 ? { x: lot.x + (lot.facing > 0 ? 6 : -6) } : {}) }, activity: ['design', 'calculate', 'stc', 'grid'].includes(task.tag) ? 'read' : 'work', inside: null, label: task.label };
    }
    const action = lastAction(agent);
    const pick = (key) => ({ ...SPOTS[key][index % SPOTS[key].length], spotKey: key });
    if (action === 'rest' || (hourOfDay >= 22 || hourOfDay < 6)) { const s = pick('bunk'); return { place: 'guild', position: s, activity: 'sleep', inside: 'guild', label: 'Resting' }; }
    if (action === 'break') { const s = pick('cafe'); return { place: 'cafe', position: s, activity: 'sit', inside: 'cafe', label: 'On a break' }; }
    if (action === 'study' || action === 'deep_work') { const s = pick('shelf'); return { place: 'library', position: s, activity: 'read', inside: 'library', label: 'Studying the standards' }; }
    if (action === 'social' || action === 'mentor' || action === 'praise') { const s = pick('fire'); return { place: 'campfire', position: s, activity: 'talk', inside: null, label: 'Talking with the crew' }; }
    if (action === 'inspect' || action === 'walk') { const s = pick('yard'); return { place: 'training', position: s, activity: 'look', inside: null, label: 'Inspecting' }; }
    if (task && task.jobId) { const s = pick('desk'); return { place: 'workshop', position: s, activity: 'read', inside: 'workshop', label: task.label }; }
    // Idle minions drift around town over the day instead of crowding the square.
    const haunts = [['square', 'square', 'Idle'], ['cafe', 'cafe', 'At the cafe'], ['yard', 'training', 'Watching training'], ['fire', 'campfire', 'By the fire'], ['shelf', 'library', 'Browsing the library']];
    const [key, place, label] = haunts[(index + Math.floor(hourOfDay / 3)) % haunts.length];
    const s = pick(key); return { place, position: s, activity: key === 'cafe' ? 'sit' : key === 'shelf' ? 'read' : 'idle', inside: SPOTS[key][0].inside || null, label };
}

/** Speech bubble text: most recent feed line for this agent, else a need complaint, else nothing. */
export function bubbleFor(agent, feed = [], now = 0, { maxAgeMs = 4 * 3600000 } = {}) {
    for (let i = feed.length - 1; i >= 0; i--) {
        const f = feed[i];
        if (f.agentId === agent.id && now - f.at < maxAgeMs && f.type !== 'action') return { text: f.text.replace(new RegExp(`^${agent.name}\\s*(reflects:|completed|found|reached)?\\s*`), (m) => (m.includes('reflects') ? '💭 ' : '')), kind: f.type };
    }
    const worst = Object.entries(agent.needs).sort((a, b) => a[1] - b[1])[0];
    if (worst && worst[1] < 30) return { text: { energy: 'So tired…', focus: 'Can\'t concentrate.', morale: 'Nothing goes right today.', social: 'Anyone around?', mastery: 'I should read up on that clause.', safety: 'Something feels unsafe here.' }[worst[0]], kind: 'need' };
    return null;
}

export const FEATURES = [
    { id: 'game.behaviour.lastAction', title: 'Last self-chosen action is read from the agent log', test: () => lastAction({ log: [{ events: [{ type: 'action', action: 'study' }] }, { events: [{ type: 'work', task: 'x' }] }] }) === 'work' && lastAction({ log: [] }) === 'idle' },
    { id: 'game.behaviour.work', title: 'An agent with a job task walks to that house', test: () => { const jobs = [{ id: 'J1' }]; const p = placeFor({ currentTask: { jobId: 'J1', tag: 'install', label: 'Install' }, needs: { energy: 80 }, log: [] }, { jobs }); return p.place === 'house' && p.jobId === 'J1' && p.activity === 'work'; } },
    { id: 'game.behaviour.rest', title: 'Resting or night sends agents to the guild bunks', test: () => placeFor({ currentTask: null, needs: { energy: 50 }, log: [{ events: [{ type: 'action', action: 'rest' }] }] }).place === 'guild' && placeFor({ currentTask: null, needs: { energy: 90 }, log: [] }, { hourOfDay: 23 }).activity === 'sleep' },
    { id: 'game.behaviour.places', title: 'Study → library, break → cafe, social → campfire, inspect → yard', test: () => { const mk = (a) => placeFor({ currentTask: null, needs: { energy: 80 }, log: [{ events: [{ type: 'action', action: a }] }] }, { hourOfDay: 12 }).place; return mk('study') === 'library' && mk('break') === 'cafe' && mk('social') === 'campfire' && mk('inspect') === 'training'; } },
    { id: 'game.behaviour.spotsSpread', title: 'Agents take different spots at the same place', test: () => { const a = placeFor({ currentTask: null, needs: { energy: 80 }, log: [{ events: [{ type: 'action', action: 'study' }] }] }, { index: 0, hourOfDay: 12 }); const b = placeFor({ currentTask: null, needs: { energy: 80 }, log: [{ events: [{ type: 'action', action: 'study' }] }] }, { index: 1, hourOfDay: 12 }); return a.position.x !== b.position.x; } },
    { id: 'game.behaviour.wander', title: 'Idle minions spread across town and move haunts through the day', test: () => { const mk = (index, hour) => placeFor({ currentTask: null, needs: { energy: 80 }, log: [] }, { index, hourOfDay: hour }).place; const places = new Set([0, 1, 2, 3, 4].map((i) => mk(i, 12))); return places.size === 5 && mk(0, 12) !== mk(0, 15); } },
    { id: 'game.behaviour.bubble', title: 'Speech bubbles from the feed or from an urgent need', test: () => { const agent = { id: 'A', name: 'Ann', needs: { energy: 10, focus: 80 } }; const fromFeed = bubbleFor(agent, [{ agentId: 'A', at: 100, type: 'reflection', text: 'Ann reflects: isolators again' }], 200); const fromNeed = bubbleFor(agent, [], 0); return fromFeed.text.startsWith('💭') && fromNeed.text === 'So tired…' && bubbleFor({ id: 'B', name: 'B', needs: { energy: 90 } }, [], 0) === null; } }
];
