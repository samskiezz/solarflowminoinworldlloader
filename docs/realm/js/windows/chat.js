/** Crew chat: talk to a crew member (memory-aware replies, optional LLM) and watch the crew channel. */
import { h, button, badge, empty } from '../core/ui.js';
import { reply, replyWithLlm, greeting } from '../sim/dialogue.js';
import { section, row, avatar, moodBadge } from './_shared.js';
import { makeTestCtx, openWindow, q, qa } from './_testing.js';

export const CHAT_LIMIT = 60;
export function llmAvailable() { return typeof globalThis.window !== 'undefined' && Boolean(window.SOLARFLOW_LLM && typeof window.SOLARFLOW_LLM.complete === 'function'); }

export function def(ctx) {
    return {
        id: 'chat', title: ctx.t('nav.chat'), icon: '💬', hotkey: 'Enter', width: 640, height: 520,
        tabs: [{ id: 'talk', label: 'Talk', icon: '💬' }, { id: 'channel', label: 'Crew channel', icon: '📡' }],
        render(body, { tab }) { if (tab === 'channel') return renderChannel(body, ctx); return renderTalk(body, ctx); }
    };
}

function history(ctx, agentId) { return ctx.store.get(`chat.${agentId}`, []); }
function pushMessage(ctx, agentId, msg) { ctx.store.push(`chat.${agentId}`, { ...msg, at: new Date(ctx.now()).toISOString() }, CHAT_LIMIT); }

function renderTalk(body, ctx) {
    const agents = [...ctx.world.crew(), ...ctx.world.townsfolk()]; if (!agents.length) { body.append(empty('No crew to talk to.')); return; }
    const id = ctx.store.get('ui.chatAgent'); const agent = ctx.world.agent(id) || agents[0];
    const sel = h('select', { class: 'input', onchange: () => { ctx.store.set('ui.chatAgent', sel.value); ctx.refresh('chat'); } }, agents.map((a) => h('option', { value: a.id, selected: a.id === agent.id ? '' : null }, `${a.name}${a.meta?.hired === false ? ' (townsfolk)' : ''}`)));
    const useLlm = h('input', { type: 'checkbox', checked: ctx.store.get('ui.chatLlm') && llmAvailable() ? '' : null, disabled: llmAvailable() ? null : '', onchange: () => ctx.store.set('ui.chatLlm', useLlm.checked) });
    const log = h('div', { class: 'chat-log' });
    const renderLog = () => { const msgs = history(ctx, agent.id); log.replaceChildren(...(msgs.length ? msgs.map((m) => h('div', { class: `chat-msg ${m.from === 'you' ? 'you' : 'them'}` }, h('span', { class: 'chat-from' }, m.from === 'you' ? ctx.profile().name : agent.name), h('span', { class: 'chat-text' }, m.text))) : [h('div', { class: 'chat-msg them' }, h('span', { class: 'chat-from' }, agent.name), h('span', { class: 'chat-text' }, greeting(agent, ctx.world.random)))])); log.scrollTop = log.scrollHeight; };
    renderLog();
    const input = h('input', { type: 'text', class: 'input', placeholder: `Say something to ${agent.name}… (try "how are you", "what do you remember about isolators")` });
    const send = async () => {
        const text = input.value.trim(); if (!text) return; input.value = '';
        pushMessage(ctx, agent.id, { from: 'you', text }); renderLog();
        agent.remember(`${ctx.profile().name} said: ${text}`, { tags: ['conversation'], importance: 3 });
        let answer;
        if (useLlm.checked && llmAvailable()) { try { answer = await replyWithLlm(agent, text, { memory: agent.memory, now: ctx.world.time, ctx, history: history(ctx, agent.id).slice(-8) }); } catch (e) { answer = null; } }
        if (!answer) answer = reply(agent, text, { memory: agent.memory, random: ctx.world.random, now: ctx.world.time });
        pushMessage(ctx, agent.id, { from: agent.id, text: answer }); agent.needs.social = Math.min(100, agent.needs.social + 5); ctx.saveWorld(); renderLog();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.stopPropagation(); send(); } });
    body.append(section(null, row(avatar(agent, 'md'), sel, moodBadge(agent), h('label', { class: 'field inline', title: llmAvailable() ? 'Use the configured language model for replies' : 'Configure a language model in Settings › AI' }, useLlm, ' LLM replies', llmAvailable() ? null : button('Set up', () => ctx.open('settings', { tab: 'ai' }), { small: true }))), log, row(input, button('Send', send, { kind: 'primary', small: true }), button('Clear', () => { ctx.store.set(`chat.${agent.id}`, []); renderLog(); }, { small: true }))));
}

function renderChannel(body, ctx) {
    const feed = [...ctx.world.feed].reverse().filter((f) => f.agentId).slice(0, 80);
    body.append(section('Crew channel', h('p', { class: 'muted' }, 'Everything the crew reports: completed tasks, defects found, level-ups and reflections.'), feed.length ? h('ul', { class: 'feed' }, feed.map((f) => { const a = ctx.world.agent(f.agentId); return h('li', { class: `feed-item ${f.type}` }, a ? avatar(a, 'xs') : null, ' ', h('span', { class: 'muted small' }, `D${Math.floor(f.hour / 24) + 1} ${String(Math.floor(f.hour % 24)).padStart(2, '0')}h`), ' ', f.text); })) : empty('Quiet so far. Assign tasks and run the clock.')));
}

export const FEATURES = [
    { id: 'win.chat.greeting', title: 'Crew member greets you', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const ok = qa(b, '.chat-msg.them').length === 1 && q(b, '.chat-from').textContent === 'Atlas'; t.done(); return ok; } },
    { id: 'win.chat.sendReply', title: 'Send a message and get a mood-aware reply', dom: true, test: async () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const i = q(b, 'input[type=text]'); i.value = 'how are you'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 10)); const msgs = t.ctx.store.get('chat.ATLAS'); const ok = msgs.length === 2 && /Lowest need/.test(msgs[1].text) && t.ctx.world.agent('ATLAS').memory.records.some((m) => /said: how are you/.test(m.text)); t.done(); return ok; } },
    { id: 'win.chat.memoryRecall', title: 'Agent recalls memories in conversation', dom: true, test: async () => { const t = makeTestCtx(); const a = t.ctx.world.agent('ATLAS'); a.remember('Rooftop isolator failed on the Smith job', { tags: ['isolator'], importance: 7 }); const b = openWindow(t.ctx, def(t.ctx)); const i = q(b, 'input[type=text]'); i.value = 'what do you remember about the isolator'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); await new Promise((r) => setTimeout(r, 10)); const msgs = t.ctx.store.get('chat.ATLAS'); const ok = /isolator/i.test(msgs[1].text); t.done(); return ok; } },
    { id: 'win.chat.switchAgent', title: 'Switch conversation partner', dom: true, test: () => { const t = makeTestCtx(); const b = openWindow(t.ctx, def(t.ctx)); const s = q(b, 'select'); s.value = 'NOVA'; s.dispatchEvent(new Event('change')); const ok = q(t.ctx.wm.windows.get('chat').body, '.chat-from').textContent === 'Nova'; t.done(); return ok; } },
    { id: 'win.chat.channel', title: 'Crew channel shows agent events', dom: true, test: () => { const t = makeTestCtx(); t.ctx.world.emit({ type: 'task_complete', agentId: 'NOVA', text: 'Nova completed string sizing' }); const b = openWindow(t.ctx, def(t.ctx), { tab: 'channel' }); const ok = qa(b, '.feed-item').length === 1; t.done(); return ok; } },
    { id: 'win.chat.llmOptional', title: 'LLM replies are optional and detected at runtime', test: () => typeof llmAvailable() === 'boolean' }
];
