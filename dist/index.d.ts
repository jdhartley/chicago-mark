export declare const CHICAGO_MARK_TAG = "jd-pens-chicago-mark";
export type ChicagoMarkTapDetail = {
    streakCount: number;
    burstSize: number;
};
export type ChicagoMarkFullCelebrationDetail = {
    streakCount: number;
};
export type ChicagoMarkHoldDetail = {
    holdMs: number;
};
/**
 * An extra celebration particle, drawn alongside the built-in hearts, pens, and stouts. `svg` is
 * inserted with `innerHTML`, so pass only trusted, bundled markup.
 */
export type ChicagoMarkParticle = {
    svg: string;
    weight: number;
};
export declare class JdPensChicagoMarkElement extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor();
    /** Extra particles mixed into every burst; see {@link ChicagoMarkParticle}. */
    get particles(): readonly ChicagoMarkParticle[];
    set particles(value: readonly ChicagoMarkParticle[] | null | undefined);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(): void;
}
export declare function defineChicagoMark(): void;
declare global {
    interface HTMLElementTagNameMap {
        'jd-pens-chicago-mark': JdPensChicagoMarkElement;
    }
}
