/**
 * Social awareness (pure): how minions notice and respond to the player, to
 * each other and to the world – greetings when approached, campfire
 * conversations built from memories and specialties, sheltering from storms,
 * and noticing jobs that need attention.
 */
import { mood } from './needs.js';
import { reply } from './dialogue.js';
import { SPOTS } from '../game/town.js';

const pickFrom = (list, random = Math.random) => list[Math.floor(random() * list.length) % list.length];

/** What a minion says when the player walks up (once per approach). */
export function approachLine(agent, playerName = 'boss', random = Math.random) {
    const m = mood(agent.needs); const meta = agent.meta || {};
    if (meta.hired === false) return pickFrom([`You must be the new installer. I'm ${agent.name} – ${meta.title || 'looking for work'}.`, `${agent.name} here. If you need ${(meta.specialties || ['help'])[0]}, I'm available.`, `Recruiting? I've got ${Math.round((meta.reputation || 0.5) * 100)} % reputation and nothing on today.`], random);
    if (agent.currentTask) return pickFrom([`${playerName}! I'm on "${agent.currentTask.label}" right now.`, `Busy with ${agent.currentTask.label}, but go ahead.`, `Nearly done with ${agent.currentTask.label}.`], random);
    if (m.label === 'Depleted') return pickFrom([`${playerName}… I really need a break.`, 'Running on empty here.'], random);
    if (m.moodlets.some((x) => x.id === 'lonely')) return pickFrom([`Good to see a face. Anything for me?`, `${playerName}! Finally someone to talk to.`], random);
    return pickFrom([`Hey ${playerName}.`, `What's next, ${playerName}?`, `Morning. Anything on the board?`, `${agent.name} reporting in.`], random);
}

/** A short exchange between two minions sharing a place. */
export function conversation(a, b, { random = Math.random, now = 0 } = {}) {
    const topic = topicFor(a, random);
    const question = topic.question;
    const answer = reply(b, question, { memory: b.memory, random, now }).replace(/ What should I do about .*$/, '');
    const lines = [{ speaker: a.id, text: question }, { speaker: b.id, text: answer.length > 140 ? `${answer.slice(0, 137)}…` : answer }];
    if (a.remember) a.remember(`Talked with ${b.name} about ${topic.tag}`, { tags: ['social', topic.tag], importance: 2, at: now });
    if (b.remember) b.remember(`${a.name} asked me about ${topic.tag}`, { tags: ['social', topic.tag], importance: 2, at: now });
    return { lines, topic: topic.tag };
}
export function topicFor(agent, random = Math.random) {
    const recent = agent.memory && agent.memory.recent ? agent.memory.recent(6).filter((r) => r.kind !== 'reflection' && !/said:/.test(r.text)) : [];
    const spec = (agent.meta && agent.meta.specialties) || [];
    const options = [
        ...recent.slice(0, 2).map((r) => ({ tag: (r.tags && r.tags[0]) || 'work', question: `Did you hear? ${r.text.slice(0, 70)}. What do you make of that?` })),
        ...(spec.length ? [{ tag: spec[0], question: `Anything new on ${spec[0].replace(/-/g, ' ')} lately?` }] : []),
        { tag: 'standards', question: pickFrom(['What is the voltage rise limit again?', 'Can a battery go in a bedroom?', 'How far from a window does the battery need to be?', 'Do we still need a rooftop isolator?'], random) },
        { tag: 'status', question: 'How are you holding up?' }
    ];
    return pickFrom(options, random);
}

/** Where to shelter in a storm, spread by index. */
export function shelterFor(agent, index = 0) {
    const options = [['guild', 'bunk'], ['cafe', 'cafe'], ['library', 'shelf']];
    const [place, key] = options[index % options.length];
    const spot = SPOTS[key][index % SPOTS[key].length];
    return { place, position: { x: spot.x, z: spot.z }, activity: 'sit', inside: spot.inside || place, label: 'Sheltering from the storm' };
}

/** A line for an idle crew member passing a job that needs attention. */
export function noticeLine(agent, job, random = Math.random) {
    const stage = job.stage;
    const lines = {
        lead: [`${job.customer} still hasn't had a site visit.`, `Someone should scout ${job.customer}'s place.`],
        design: [`${job.customer}'s design is waiting on string sizing.`, `We should finish the design for ${job.customer}.`],
        quote: [`${job.customer} is waiting for a quote.`], approval: [`Has the network application for ${job.customer} gone in?`],
        install: [`That array at ${job.customer}'s won't raise itself.`, `Scaffold is up at ${job.customer}'s – who's on it?`],
        commission: [`${job.customer}'s system needs its tests before we energise.`], claim: [`Serials for ${job.customer} still need uploading.`], handover: [`${job.customer} is due a handover pack.`]
    }[stage] || [`${job.customer}'s job needs a look.`];
    return pickFrom(lines, random);
}

const mk = (over = {}) => ({ id: 'A', name: 'Ann', needs: { energy: 80, focus: 80, morale: 80, social: 80, mastery: 80, safety: 80 }, traits: [], skills: {}, meta: { hired: true, title: 'Lead', specialties: ['audit'] }, memory: { recent: () => [], retrieve: () => [] }, remember() {}, ...over });
export const FEATURES = [
    { id: 'social.approach', title: 'Minions greet the player by mood, task and whether they are hired', test: () => /new installer|available|Recruiting/.test(approachLine(mk({ meta: { hired: false, title: 'Clerk', specialties: ['dedupe'] } }), 'Sam', () => 0)) && /on "Labels"/.test(approachLine(mk({ currentTask: { label: 'Labels' } }), 'Sam', () => 0)) && /break|empty/.test(approachLine(mk({ needs: { energy: 5, focus: 5, morale: 5, social: 5, mastery: 5, safety: 5 } }), 'Sam', () => 0)) },
    { id: 'social.conversation', title: 'Two minions hold a conversation drawn from memories and specialties', test: () => { let remembered = 0; const a = mk({ id: 'A', name: 'Ann', remember: () => remembered++, memory: { recent: () => [{ text: 'Isolator failed on JOB-1', tags: ['isolator'], kind: 'observation' }], retrieve: () => [] } }); const b = mk({ id: 'B', name: 'Bob', remember: () => remembered++ }); const c = conversation(a, b, { random: () => 0 }); return c.lines.length === 2 && c.lines[0].speaker === 'A' && /Isolator failed/.test(c.lines[0].text) && c.lines[1].text.length > 3 && remembered === 2; } },
    { id: 'social.standardsTopic', title: 'Campfire talk includes standards questions answered from the Codex', test: () => { const a = mk({ meta: { hired: true, specialties: [] }, memory: { recent: () => [], retrieve: () => [] } }); const b = mk({ id: 'B', name: 'Bob' }); const c = conversation(a, b, { random: () => 0.01 }); return c.topic === 'standards' && /AS\/NZS/.test(c.lines[1].text); } },
    { id: 'social.shelter', title: 'Storm shelter assignments spread across guild, cafe and library', test: () => shelterFor({}, 0).place === 'guild' && shelterFor({}, 1).place === 'cafe' && shelterFor({}, 2).place === 'library' && shelterFor({}, 0).activity === 'sit' },
    { id: 'social.notice', title: 'Idle crew remark on jobs that need attention, by stage', test: () => /scout|site visit/.test(noticeLine({}, { customer: 'Nguyen', stage: 'lead' }, () => 0)) && /tests/.test(noticeLine({}, { customer: 'Nguyen', stage: 'commission' }, () => 0)) }
];
