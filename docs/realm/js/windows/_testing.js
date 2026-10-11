/** Test harness for window self-tests: a real context on a detached root. */
import { createContext } from '../core/context.js';

export const SAMPLE_CATALOGUE = {
    metadata: { totalProducts: 5, simulated: false },
    categories: {
        solar_panels: [
            { id: 'PV-A440', manufacturer: 'Alpha Solar', model: 'A-440M', category: 'solar_panel', type: 'Mono', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { power_watts: 440, voc: 49.5, vmp: 41.2, isc: 11.3, imp: 10.7, temp_coeff_voc: -0.27, temp_coeff_pmax: -0.34, fire_tested: true } },
            { id: 'PV-B400', manufacturer: 'Beta PV', model: 'B-400', category: 'solar_panel', type: 'Mono', cerApproved: false, approvedDate: '2020-01-01', expiryDate: '2024-01-01', specifications: { power_watts: 400, voc: 45, vmp: 37, isc: 11, temp_coeff_voc: -0.28 } }
        ],
        inverters: [
            { id: 'INV-G5', manufacturer: 'Gamma', model: 'G5 Hybrid', category: 'inverter', type: 'Hybrid', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { ac_power_kw: 5, ac_power_watts: 5000, phases: 1, max_dc_voltage: 600, mppt_min: 90, mppt_max: 560, max_input_current: 16, inverter_standard: 'AS/NZS 4777.2:2020' } },
            { id: 'INV-G10', manufacturer: 'Gamma', model: 'G10 Three', category: 'inverter', type: 'Grid', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2028-01-01', specifications: { ac_power_kw: 10, ac_power_watts: 10000, phases: 3, max_dc_voltage: 1000, mppt_min: 200, mppt_max: 850, max_input_current: 26 } }
        ],
        batteries: [
            { id: 'BAT-D13', manufacturer: 'Delta Storage', model: 'D13', category: 'battery', type: 'LFP', cerApproved: true, approvedDate: '2025-01-01', expiryDate: '2027-06-01', specifications: { nominal_capacity_kwh: 13.5, usable_capacity_kwh: 13, chemistry: 'LFP' } }
        ]
    }
};

export function makeTestCtx({ withJob = true } = {}) {
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;left:0;top:0;width:1280px;height:800px;overflow:hidden;';
    document.body.append(root);
    const ctx = createContext({ root, products: SAMPLE_CATALOGUE, seed: 7, now: () => 1767600000000 });
    ctx.wm.viewportFn = () => ({ w: 1280, h: 800 });
    let job = null;
    if (withJob) { job = ctx.world.addJob({ customer: 'Test Customer', address: '1 Sun St', postcode: '2000', systemKw: 6.6, batteryKwh: 13, phases: 1 }); ctx.setCurrentJob(job.id); }
    return { ctx, root, job, done: () => { ctx.clock.stop(); ctx.wm.closeAll(); root.remove(); } };
}

/** Open a window definition inside a test context and return its body element. */
export function openWindow(ctx, def, options = {}) {
    if (!ctx.wm.has(def.id)) ctx.wm.register(def);
    const win = ctx.wm.open(def.id, options);
    return win.body;
}
export const q = (el, sel) => el.querySelector(sel);
export const qa = (el, sel) => [...el.querySelectorAll(sel)];
export const fire = (el, type = 'input') => { el.dispatchEvent(new Event(type, { bubbles: true })); return el; };
