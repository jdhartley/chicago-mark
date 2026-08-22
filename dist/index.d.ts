export declare const CHICAGO_MARK_TAG = "jd-pens-chicago-mark";
export type ChicagoMarkTapDetail = {
    streakCount: number;
    burstSize: number;
};
export type ChicagoMarkFullCelebrationDetail = {
    streakCount: number;
};
export declare class JdPensChicagoMarkElement extends HTMLElement {
    #private;
    static readonly observedAttributes: string[];
    constructor();
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
