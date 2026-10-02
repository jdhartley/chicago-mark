import { DEFAULT_BASE_COLOR, CELEBRATION_STREAK_GAP_MS, DEFAULT_FULL_AFTER_MS, DEFAULT_FULL_AFTER_TAPS, DEFAULT_HOLD_MS, DEFAULT_INK_COLOR, DEFAULT_PARTICLE_WEIGHTS, DEFAULT_SIZE, advanceCelebrationMeter, celebrationBurstSize, celebrationParticleBudget, celebrationStoutLevelForRoll, normalizeWeightList, parseBoundedNumber, parseHexColor, parseHexColorList, particleWeight, pickWeightedIndex, } from './core.js';
export const CHICAGO_MARK_TAG = 'jd-pens-chicago-mark';
const BUILT_IN_ICONS = ['heart', 'pen', 'stout'];
const STAR = 'M10 0 12.89 5 18.66 5 15.77 10 18.66 15 12.89 15 10 20 7.11 15 1.34 15 4.23 10 1.34 5 7.11 5Z';
const HEART = 'M10 19 2.4 11a4.7 4.7 0 0 1 0-6.6 4.5 4.5 0 0 1 6.4 0L10 5.6l1.2-1.2a4.5 4.5 0 0 1 6.4 0 4.7 4.7 0 0 1 0 6.6Z';
const TEMPLATE = `
  <style>${styles()}</style>
  <button type="button" aria-pressed="false">
    <svg viewBox="0 0 92 20" fill="currentColor" aria-hidden="true">
      ${[0, 24, 48, 72]
    .map((offset, index) => `<g style="--i:${index};--enter:${offset / 24 * 55}ms;--exit:${165 - offset / 24 * 55}ms" transform="translate(${offset} 0)">
            <g><path class="star" d="${STAR}"></path><path class="heart" d="${HEART}"></path><path class="ink" d="${HEART}"></path></g>
          </g>`)
    .join('')}
    </svg>
  </button>
  <div class="celebration-layer" aria-hidden="true"></div>
`;
export class JdPensChicagoMarkElement extends HTMLElement {
    static observedAttributes = [
        'aria-label',
        'base-color',
        'size',
        'heart-colors',
        'heart-weight',
        'pen-weight',
        'stout-weight',
        'full-after-taps',
        'full-after-ms',
        'hold-to-ink',
        'hold-ms',
        'ink-color',
    ];
    #button;
    #layer;
    #particleTimers = new Set();
    #particles = [];
    #holdTimer = null;
    #inking = false;
    #inked = false;
    #swallowClick = false;
    #meter = {
        startedAt: 0,
        lastTapAt: null,
        count: 0,
        lastFullAt: Number.NEGATIVE_INFINITY,
    };
    #pointed = false;
    #held = false;
    #interacted = false;
    #connected = false;
    constructor() {
        super();
        const root = this.attachShadow({ mode: 'open' });
        root.innerHTML = TEMPLATE;
        this.#button = requiredElement(root, 'button', HTMLButtonElement);
        this.#layer = requiredElement(root, '.celebration-layer', HTMLDivElement);
    }
    /** Extra particles mixed into every burst; see {@link ChicagoMarkParticle}. */
    get particles() {
        return this.#particles;
    }
    set particles(value) {
        this.#particles = Array.isArray(value)
            ? value
                .filter((particle) => typeof particle?.svg === 'string' && particle.svg.trim() !== '')
                .map((particle) => ({ svg: particle.svg, weight: Number(particle.weight) }))
            : [];
    }
    connectedCallback() {
        if (this.#connected)
            return;
        this.#connected = true;
        this.#upgradeProperty('particles');
        this.#button.addEventListener('mouseenter', this.#onEnter);
        this.#button.addEventListener('mouseleave', this.#onLeave);
        this.#button.addEventListener('focus', this.#onEnter);
        this.#button.addEventListener('blur', this.#onBlur);
        this.#button.addEventListener('click', this.#onClick);
        this.#button.addEventListener('pointerdown', this.#onPointerDown);
        this.#button.addEventListener('pointerup', this.#onHoldEnd);
        this.#button.addEventListener('pointercancel', this.#onHoldEnd);
        this.#button.addEventListener('pointerleave', this.#onHoldEnd);
        this.#button.addEventListener('keydown', this.#onKeyDown);
        this.#button.addEventListener('keyup', this.#onKeyUp);
        this.#button.addEventListener('contextmenu', this.#onContextMenu);
        document.addEventListener('pointerdown', this.#onDocumentPointerDown);
        document.addEventListener('keydown', this.#onDocumentKeyDown);
        this.#syncAttributes();
    }
    disconnectedCallback() {
        if (!this.#connected)
            return;
        this.#connected = false;
        this.#button.removeEventListener('mouseenter', this.#onEnter);
        this.#button.removeEventListener('mouseleave', this.#onLeave);
        this.#button.removeEventListener('focus', this.#onEnter);
        this.#button.removeEventListener('blur', this.#onBlur);
        this.#button.removeEventListener('click', this.#onClick);
        this.#button.removeEventListener('pointerdown', this.#onPointerDown);
        this.#button.removeEventListener('pointerup', this.#onHoldEnd);
        this.#button.removeEventListener('pointercancel', this.#onHoldEnd);
        this.#button.removeEventListener('pointerleave', this.#onHoldEnd);
        this.#button.removeEventListener('keydown', this.#onKeyDown);
        this.#button.removeEventListener('keyup', this.#onKeyUp);
        this.#button.removeEventListener('contextmenu', this.#onContextMenu);
        document.removeEventListener('pointerdown', this.#onDocumentPointerDown);
        document.removeEventListener('keydown', this.#onDocumentKeyDown);
        this.#stopHold();
        for (const timer of this.#particleTimers)
            window.clearTimeout(timer);
        this.#particleTimers.clear();
        this.#layer.replaceChildren();
    }
    attributeChangedCallback() {
        if (!this.#connected)
            return;
        if (!this.#holdArmed)
            this.#stopHold();
        this.#syncAttributes();
    }
    // A framework can set a property before the element is defined; that own property would shadow
    // the accessor, so pass it through the setter once the class is in place.
    #upgradeProperty(name) {
        if (!Object.prototype.hasOwnProperty.call(this, name))
            return;
        const value = this[name];
        delete this[name];
        this.particles = value;
    }
    get #holdArmed() {
        return this.hasAttribute('hold-to-ink');
    }
    #holdMs() {
        return parseBoundedNumber(this.getAttribute('hold-ms'), DEFAULT_HOLD_MS, 600, 10_000);
    }
    #onPointerDown = (event) => {
        // A new press owns its own click; a hold that ended off the button never got its click.
        this.#swallowClick = false;
        if (!this.#holdArmed || !event.isPrimary || event.button !== 0)
            return;
        this.#startHold();
    };
    #onHoldEnd = () => {
        this.#stopHold();
    };
    #onKeyDown = (event) => {
        if (event.key !== ' ' || event.repeat || !this.#holdArmed)
            return;
        this.#startHold();
    };
    #onKeyUp = (event) => {
        if (event.key === ' ')
            this.#stopHold();
    };
    #onContextMenu = (event) => {
        if (this.#holdArmed)
            event.preventDefault();
    };
    #onBlur = () => {
        this.#stopHold();
        this.#onLeave();
    };
    // Holding the armed mark inks its hearts one by one; the fourth completes the hold. Releasing
    // early drains them and leaves the ordinary tap to the click that follows.
    #startHold() {
        this.#stopHold();
        const holdMs = this.#holdMs();
        this.style.setProperty('--jd-chicago-mark-ink-step', `${holdMs / 4}ms`);
        this.#interacted = true;
        this.#pointed = true;
        this.#inking = true;
        this.#swallowClick = false;
        this.#syncState();
        this.#holdTimer = window.setTimeout(() => {
            this.#holdTimer = null;
            this.#inking = false;
            this.#inked = true;
            this.#swallowClick = true;
            this.#syncState();
            this.dispatchEvent(new CustomEvent('jd-chicago-mark-hold', {
                bubbles: true,
                composed: true,
                detail: { holdMs },
            }));
        }, holdMs);
    }
    #stopHold() {
        if (this.#holdTimer !== null)
            window.clearTimeout(this.#holdTimer);
        this.#holdTimer = null;
        if (!this.#inking && !this.#inked)
            return;
        this.#inking = false;
        this.#inked = false;
        this.#syncState();
    }
    #onEnter = () => {
        this.#interacted = true;
        this.#pointed = true;
        this.#syncState();
    };
    #onLeave = () => {
        this.#pointed = false;
        this.#syncState();
    };
    #onClick = () => {
        // The click that ends a completed hold is not a tap.
        if (this.#swallowClick) {
            this.#swallowClick = false;
            return;
        }
        this.#interacted = true;
        this.#held = !this.#held;
        this.#syncState();
        this.#celebrate();
    };
    #onDocumentPointerDown = (event) => {
        if (!this.#fond || event.composedPath().includes(this))
            return;
        this.#release();
    };
    #onDocumentKeyDown = (event) => {
        if (event.key === 'Escape')
            this.#release();
    };
    get #fond() {
        return this.#pointed || this.#held;
    }
    #release() {
        this.#pointed = false;
        this.#held = false;
        this.#syncState();
    }
    #syncState() {
        const classes = [this.#fond ? 'fond' : this.#interacted ? 'receding' : ''];
        if (this.#inking)
            classes.push('inking');
        if (this.#inked)
            classes.push('inked');
        this.#button.className = classes.filter(Boolean).join(' ');
        this.#button.setAttribute('aria-pressed', String(this.#held));
    }
    #syncAttributes() {
        const label = this.getAttribute('aria-label')?.trim() || 'Chicago';
        this.#button.setAttribute('aria-label', label);
        this.style.setProperty('--jd-chicago-mark-color', parseHexColor(this.getAttribute('base-color'), DEFAULT_BASE_COLOR));
        this.style.setProperty('--jd-chicago-mark-size', `${parseBoundedNumber(this.getAttribute('size'), DEFAULT_SIZE, 24, 240)}px`);
        this.style.setProperty('--jd-chicago-mark-ink', parseHexColor(this.getAttribute('ink-color'), DEFAULT_INK_COLOR));
    }
    #celebrate() {
        const now = performance.now();
        const previousMeter = this.#meter;
        const gap = previousMeter.lastTapAt === null ? null : now - previousMeter.lastTapAt;
        const threshold = {
            taps: Math.round(parseBoundedNumber(this.getAttribute('full-after-taps'), DEFAULT_FULL_AFTER_TAPS, 2, 100)),
            durationMs: parseBoundedNumber(this.getAttribute('full-after-ms'), DEFAULT_FULL_AFTER_MS, 500, 30_000),
        };
        const next = advanceCelebrationMeter(previousMeter, now, threshold);
        const streakCount = previousMeter.lastTapAt !== null && gap !== null && gap <= CELEBRATION_STREAK_GAP_MS
            ? previousMeter.count + 1
            : 1;
        this.#meter = next.meter;
        const burstSize = celebrationBurstSize(gap, streakCount);
        this.dispatchEvent(new CustomEvent('jd-chicago-mark-tap', {
            bubbles: true,
            composed: true,
            detail: { streakCount, burstSize },
        }));
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
            return;
        const rect = this.#button.getBoundingClientRect();
        const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        const compact = window.innerWidth <= 640 || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
        const budget = celebrationParticleBudget(window.innerWidth, window.innerHeight, compact);
        const weights = this.#weights();
        const particles = localParticles(origin, burstSize, weights);
        if (next.fullScreen) {
            particles.push(...fullScreenParticles(origin, budget.fullScreenCount, weights, parseHexColorList(this.getAttribute('heart-colors'))));
            this.dispatchEvent(new CustomEvent('jd-chicago-mark-full-celebration', {
                bubbles: true,
                composed: true,
                detail: { streakCount },
            }));
        }
        for (const particle of particles)
            this.#appendParticle(particle);
        while (this.#layer.childElementCount > budget.limit)
            this.#layer.firstElementChild?.remove();
    }
    // Built-in weights first, in BUILT_IN_ICONS order, then one per custom particle; all normalized
    // together, so `pen-weight="0"` plus a custom pen swaps the pen's drawing at the same share.
    #weights() {
        const value = (name) => {
            const attribute = this.getAttribute(name);
            return attribute === null || attribute.trim() === '' ? undefined : Number(attribute);
        };
        const raw = [
            particleWeight(value('heart-weight'), DEFAULT_PARTICLE_WEIGHTS.heart),
            particleWeight(value('pen-weight'), DEFAULT_PARTICLE_WEIGHTS.pen),
            particleWeight(value('stout-weight'), DEFAULT_PARTICLE_WEIGHTS.stout),
            ...this.#particles.map((particle) => particle.weight),
        ];
        return (normalizeWeightList(raw) ??
            normalizeWeightList([
                DEFAULT_PARTICLE_WEIGHTS.heart,
                DEFAULT_PARTICLE_WEIGHTS.pen,
                DEFAULT_PARTICLE_WEIGHTS.stout,
            ]) ??
            []);
    }
    #appendParticle(particle) {
        const element = document.createElement('span');
        element.className = `particle ${particle.kind} ${particle.icon}`;
        element.style.cssText = [
            `--x:${particle.x}px`,
            `--y:${particle.y}px`,
            `--dx:${particle.dx}px`,
            `--dy:${particle.dy}px`,
            `--rotation:${particle.rotation}deg`,
            `--scale:${particle.scale}`,
            `--size:${particle.size}px`,
            `--duration:${particle.duration}ms`,
            `--delay:${particle.delay}ms`,
            particle.heartColor ? `--heart-color:${particle.heartColor}` : '',
        ].join(';');
        if (particle.icon === 'heart')
            element.innerHTML = heartSvg();
        else if (particle.icon === 'stout')
            element.innerHTML = stoutSvg(particle.stoutLevel ?? 'full');
        else if (particle.icon === 'custom')
            element.innerHTML = this.#particles[particle.custom ?? 0]?.svg ?? '';
        else
            element.textContent = '🖋️';
        this.#layer.append(element);
        const timer = window.setTimeout(() => {
            element.remove();
            this.#particleTimers.delete(timer);
        }, particle.duration + particle.delay + 120);
        this.#particleTimers.add(timer);
    }
}
export function defineChicagoMark() {
    if (typeof customElements !== 'undefined' && !customElements.get(CHICAGO_MARK_TAG)) {
        customElements.define(CHICAGO_MARK_TAG, JdPensChicagoMarkElement);
    }
}
defineChicagoMark();
function rollIcon(weights) {
    const index = pickWeightedIndex(Math.random(), weights);
    const builtIn = BUILT_IN_ICONS[index];
    return builtIn ? { icon: builtIn } : { icon: 'custom', custom: index - BUILT_IN_ICONS.length };
}
function localParticles(origin, count, weights) {
    return Array.from({ length: count }, (_, index) => {
        const { icon, custom } = rollIcon(weights);
        const duration = between(1_150, 1_750);
        const delay = index * between(16, 42);
        return {
            icon,
            custom,
            kind: 'float',
            stoutLevel: icon === 'stout' ? celebrationStoutLevelForRoll(Math.random()) : undefined,
            x: origin.x + between(-8, 8),
            y: origin.y + between(-5, 5),
            dx: between(-55 - count * 4, 55 + count * 4),
            dy: between(-245 - count * 4, -120),
            rotation: between(-32, 32),
            scale: between(0.82, 1.18),
            size: between(14, 21),
            duration,
            delay,
        };
    });
}
function fullScreenParticles(origin, count, weights, heartColors) {
    return Array.from({ length: count }, () => {
        const targetX = between(18, Math.max(19, window.innerWidth - 18));
        const targetY = between(20, Math.max(21, window.innerHeight - 24));
        const { icon, custom } = rollIcon(weights);
        return {
            icon,
            custom,
            kind: 'confetti',
            stoutLevel: icon === 'stout' ? celebrationStoutLevelForRoll(Math.random()) : undefined,
            heartColor: icon === 'heart' ? heartColors[Math.floor(Math.random() * heartColors.length)] : undefined,
            x: origin.x,
            y: origin.y,
            dx: targetX - origin.x,
            dy: targetY - origin.y,
            rotation: between(-180, 180),
            scale: between(0.82, 1.32),
            size: between(16, 29),
            duration: between(1_550, 2_350),
            delay: between(0, 260),
        };
    });
}
function between(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
}
function requiredElement(root, selector, constructor) {
    const element = root.querySelector(selector);
    if (!(element instanceof constructor))
        throw new Error(`Missing ${selector}`);
    return element;
}
function heartSvg() {
    return `<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="${HEART}"></path></svg>`;
}
function stoutSvg(level) {
    const fill = level === 'split'
        ? '<path class="stout" d="M4.2 12.9h11.6l-.7 11.6H4.9z"></path><path class="split-head" d="M4.1 10h11.8l-.15 2.9H4.2z"></path><path class="lacing" d="M4.05 6.8c2.2.7 3.9-.5 5.8.2 2 .8 3.7-.3 6.1.3"></path>'
        : '<path class="stout" d="M3.95 7h12.1L15 24.5H5z"></path><path class="foam" d="M3.8 4.2c1.2-1.4 2.8-1.1 3.8-.4 1-1.4 3.5-1.5 4.5-.1 1.5-.8 3.7-.3 4.1 1.4l-.15 2.4H3.95z"></path>';
    return `<svg class="stout-pint ${level}" viewBox="0 0 20 28" aria-hidden="true"><path class="glass" d="M3 2.2h14l-1.5 23.6h-11z"></path>${fill}<path class="monogram" d="M12.8 11.2a4 4 0 1 0 .2 6.7v-3.1h-3.2" transform="translate(2.3 -0.25) scale(0.85)"></path><path class="rim" d="M3 2.2h14"></path></svg>`;
}
function styles() {
    return `
    :host { display: inline-flex; color: var(--jd-chicago-mark-color, ${DEFAULT_BASE_COLOR}); }
    button { display:inline-flex;align-items:center;padding:12px 2px 12px 10px;border:0;background:transparent;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;touch-action:manipulation; }
    :host([hold-to-ink]) button { touch-action:none; }
    button:focus-visible { outline:2px solid currentColor;outline-offset:2px;border-radius:6px; }
    button svg { width:var(--jd-chicago-mark-size, ${DEFAULT_SIZE}px);height:auto;overflow:visible;opacity:.75;transition:opacity 220ms ease; }
    button.fond svg { opacity:.85; }
    svg > g > g, svg path { transform-box:fill-box;transform-origin:center; }
    svg path { transition:opacity 180ms ease,transform 220ms cubic-bezier(.34,1.56,.64,1); }
    .star { opacity:1;transform:scale(1); }
    .heart { opacity:0;transform:scale(.72); }
    button.fond .star { opacity:0;transform:scale(.72); }
    button.fond .heart { opacity:1;transform:scale(1); }
    button.fond svg > g > g { animation:mark-pop 460ms cubic-bezier(.34,1.56,.64,1) both;animation-delay:var(--enter); }
    button.fond svg path { transition-delay:var(--enter); }
    button.receding svg > g > g { animation:mark-pop-reverse 460ms cubic-bezier(.34,1.56,.64,1) reverse both;animation-delay:var(--exit); }
    button.receding svg path { transition-delay:var(--exit); }
    @keyframes mark-pop { 0%{transform:scale(1)}38%{transform:scale(1.42) rotate(-7deg)}68%{transform:scale(.94)}100%{transform:scale(1)} }
    @keyframes mark-pop-reverse { 0%{transform:scale(1)}38%{transform:scale(1.42) rotate(-7deg)}68%{transform:scale(.94)}100%{transform:scale(1)} }
    button svg path.ink { fill:var(--jd-chicago-mark-ink,${DEFAULT_INK_COLOR});opacity:1;transform:none;-webkit-clip-path:inset(100% 0 0 0);clip-path:inset(100% 0 0 0);transition:-webkit-clip-path 180ms ease,clip-path 180ms ease;transition-delay:0ms; }
    button.inking svg path.ink,button.inked svg path.ink { -webkit-clip-path:inset(0 0 0 0);clip-path:inset(0 0 0 0); }
    button.inking svg path.ink { transition:-webkit-clip-path var(--jd-chicago-mark-ink-step,500ms) linear,clip-path var(--jd-chicago-mark-ink-step,500ms) linear;transition-delay:calc(var(--i) * var(--jd-chicago-mark-ink-step,500ms)); }
    .celebration-layer { position:fixed;z-index:140;overflow:hidden;pointer-events:none;contain:strict;inset:0; }
    .particle { position:absolute;top:var(--y);left:var(--x);font-family:"Apple Color Emoji","Segoe UI Emoji",sans-serif;font-size:var(--size);line-height:1;opacity:0;text-shadow:0 2px 10px rgba(0,0,0,.28);transform:translate(-50%,-50%) scale(.35);animation-delay:var(--delay);animation-duration:var(--duration);animation-fill-mode:both; }
    .particle.heart { color:var(--heart-color,var(--jd-chicago-mark-color,${DEFAULT_BASE_COLOR})); }
    .particle > svg { display:block;width:1em;height:1em;overflow:visible; }
    .stout-pint .glass { fill:rgba(246,237,219,.08);stroke:rgba(231,216,190,.9);stroke-linejoin:round;stroke-width:.85; }
    .stout-pint .stout { fill:#150d09; }
    .stout-pint .foam,.stout-pint .split-head { fill:#ead8b6; }
    .stout-pint .lacing { fill:none;stroke:rgba(234,216,182,.58);stroke-linecap:round;stroke-width:.65; }
    .stout-pint .monogram { fill:none;stroke:#f7efe1;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.15; }
    .stout-pint .rim { fill:none;stroke:#c9a45d;stroke-linecap:round;stroke-width:.9; }
    .particle.float { animation-name:emoji-float;animation-timing-function:cubic-bezier(.16,.72,.22,1); }
    .particle.confetti { text-shadow:none;animation-name:emoji-confetti;animation-timing-function:cubic-bezier(.12,.7,.2,1); }
    @keyframes emoji-float { 0%{opacity:0;transform:translate(-50%,-50%) scale(.35) rotate(0)}12%{opacity:1}72%{opacity:.92}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(var(--scale)) rotate(var(--rotation))} }
    @keyframes emoji-confetti { 0%{opacity:0;transform:translate(-50%,-50%) scale(.2) rotate(0)}9%{opacity:1}68%{opacity:.95}100%{opacity:0;transform:translate(calc(-50% + var(--dx)),calc(-50% + var(--dy))) scale(var(--scale)) rotate(var(--rotation))} }
    @media (prefers-reduced-motion:reduce) { button.fond svg > g > g,button.receding svg > g > g{animation:none}button svg,svg path{transition:none}.celebration-layer{display:none}button.inking svg path.ink{transition:-webkit-clip-path 0s,clip-path 0s;transition-delay:calc((var(--i) + 1) * var(--jd-chicago-mark-ink-step,500ms))} }
  `;
}
