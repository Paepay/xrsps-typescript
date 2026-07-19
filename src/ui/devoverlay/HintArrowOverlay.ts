import { vec3 } from "gl-matrix";
import {
    DrawCall,
    App as PicoApp,
    PicoGL,
    Program,
    Texture,
    UniformBuffer,
    VertexArray,
    VertexBuffer,
} from "picogl";

import type { CacheIndex } from "../../rs/cache/CacheIndex";
import type { CacheSystem } from "../../rs/cache/CacheSystem";
import { IndexType } from "../../rs/cache/IndexType";
import { GraphicsDefaults } from "../../rs/config/defaults/GraphicsDefaults";
import { IndexedSprite } from "../../rs/sprite/IndexedSprite";
import { SpriteLoader } from "../../rs/sprite/SpriteLoader";
import {
    HintArrowEntry,
    Overlay,
    OverlayInitArgs,
    OverlayUpdateArgs,
    RenderPhase,
} from "./Overlay";

export interface HintArrowContext {
    getCacheSystem: () => CacheSystem;
    getLoadedCacheInfo: () => any;
}

interface SpriteTexture {
    tex: Texture;
    w: number;
    h: number;
}

/**
 * OSRS world hint arrow (headicons_hint[0]) drawn above a tile / NPC.
 * Reference: QueuedKeyboardEvent.java / GrandExchangeOfferWorldComparator.java
 */
export class HintArrowOverlay implements Overlay {
    constructor(
        private readonly program: Program,
        private readonly ctx: HintArrowContext,
    ) {}

    private app!: PicoApp;
    private sceneUniforms!: UniformBuffer;

    private positions?: VertexBuffer;
    private uvs?: VertexBuffer;
    private array?: VertexArray;
    private drawCall?: DrawCall;

    private spriteIndex?: CacheIndex;
    private hintSprite?: SpriteTexture;
    private headIconsHintArchiveId: number = -1;
    private loadFailed = false;

    private screenSize: Float32Array = new Float32Array(2);
    private tint: Float32Array = new Float32Array([1, 1, 1, 1]);
    private centerWorld: vec3 = vec3.create();
    private quadVerts: Float32Array = new Float32Array(12);
    private quadUvs: Float32Array = new Float32Array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0]);

    private lastArgs?: OverlayUpdateArgs;

    init(args: OverlayInitArgs): void {
        this.app = args.app;
        this.sceneUniforms = args.sceneUniforms;

        this.positions = this.app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array(12));
        this.uvs = this.app.createVertexBuffer(PicoGL.FLOAT, 2, this.quadUvs);
        this.array = this.app
            .createVertexArray()
            .vertexAttributeBuffer(0, this.positions)
            .vertexAttributeBuffer(1, this.uvs);
        this.drawCall = this.app
            .createDrawCall(this.program, this.array)
            .uniformBlock("SceneUniforms", this.sceneUniforms)
            .uniform("u_screenSize", this.screenSize)
            .uniform("u_tint", this.tint)
            .primitive(PicoGL.TRIANGLES);

        this.destroyTextures();
        this.loadFailed = false;
        this.initAssetsFromCache();
    }

    private destroyTextures(): void {
        try {
            this.hintSprite?.tex.delete?.();
        } catch {}
        this.hintSprite = undefined;
    }

    dispose(): void {
        this.destroyTextures();
        try {
            this.positions?.delete?.();
            this.uvs?.delete?.();
            this.array?.delete?.();
        } catch {}
        this.positions = undefined;
        this.uvs = undefined;
        this.array = undefined;
        this.drawCall = undefined;
    }

    private initAssetsFromCache(): void {
        try {
            const cacheSystem = this.ctx.getCacheSystem();
            if (!cacheSystem) return;
            this.spriteIndex = cacheSystem.getIndex(IndexType.DAT2.sprites);

            const cacheInfo = this.ctx.getLoadedCacheInfo?.();
            if (cacheInfo) {
                const defaults = GraphicsDefaults.load(cacheInfo, cacheSystem);
                this.headIconsHintArchiveId = defaults.headIconsHint;
            }

            if (this.headIconsHintArchiveId < 0 && this.spriteIndex) {
                try {
                    this.headIconsHintArchiveId = this.spriteIndex.getArchiveId("headicons_hint");
                } catch {}
            }
        } catch (err) {
            console.warn("[HintArrowOverlay] initAssetsFromCache error", err);
        }
    }

    private getHintSprite(): SpriteTexture | undefined {
        if (this.hintSprite) return this.hintSprite;
        if (this.loadFailed) return undefined;
        if (!this.spriteIndex || this.headIconsHintArchiveId < 0) {
            this.loadFailed = true;
            return undefined;
        }

        try {
            const sprites = SpriteLoader.loadIntoIndexedSprites(
                this.spriteIndex,
                this.headIconsHintArchiveId,
            );
            const indexed = sprites?.[0];
            if (!indexed) {
                this.loadFailed = true;
                return undefined;
            }
            this.hintSprite = this.createTextureFromIndexedSprite(indexed);
            return this.hintSprite;
        } catch (err) {
            console.warn("[HintArrowOverlay] failed to load headicons_hint", err);
            this.loadFailed = true;
            return undefined;
        }
    }

    private createTextureFromIndexedSprite(spr: IndexedSprite): SpriteTexture {
        const width = Math.max(1, spr.subWidth | 0);
        const height = Math.max(1, spr.subHeight | 0);
        const pixels = new Uint8Array(width * height * 4);
        const palette = spr.palette ?? new Int32Array([0xff_ff_ff_ff]);
        const src = spr.pixels ?? new Uint8Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const idx = src[i] & 0xff;
            const color = palette[idx] ?? 0;
            const r = (color >> 16) & 0xff;
            const g = (color >> 8) & 0xff;
            const b = color & 0xff;
            const a = idx === 0 ? 0 : 0xff;
            const di = i * 4;
            pixels[di] = r;
            pixels[di + 1] = g;
            pixels[di + 2] = b;
            pixels[di + 3] = a;
        }
        const tex = this.app.createTexture2D(pixels, width, height, {
            internalFormat: PicoGL.RGBA8,
            type: PicoGL.UNSIGNED_BYTE,
            minFilter: PicoGL.NEAREST,
            magFilter: PicoGL.NEAREST,
            wrapS: PicoGL.CLAMP_TO_EDGE,
            wrapT: PicoGL.CLAMP_TO_EDGE,
        });
        return { tex, w: width, h: height };
    }

    update(args: OverlayUpdateArgs): void {
        this.lastArgs = args;
    }

    draw(phase: RenderPhase): void {
        if (phase !== RenderPhase.ToFrameTexture) return;
        if (!this.drawCall || !this.positions || !this.uvs) return;

        const args = this.lastArgs;
        if (!args) return;
        const entries = args.state.hintArrows as HintArrowEntry[] | undefined;
        if (!entries || entries.length === 0) return;

        const sprite = this.getHintSprite();
        if (!sprite) return;

        this.screenSize[0] = this.app.width;
        this.screenSize[1] = this.app.height;
        this.app.enable(PicoGL.BLEND);
        this.app.disable(PicoGL.DEPTH_TEST);

        const helpers = args.helpers;
        const center = this.centerWorld;
        const spriteW = sprite.w;
        const spriteH = sprite.h;
        // OSRS: drawAtInternal(viewportTempX - 12, viewportTempY - 28)
        const x = -Math.floor(spriteW / 2);
        const y = -28;

        for (const entry of entries) {
            const plane = entry.plane | 0;
            const height = helpers.getTileHeightAtPlane(entry.worldX, entry.worldZ, plane);
            const headOffset = entry.heightOffsetTiles ?? 0.9;

            center[0] = entry.worldX;
            center[1] = height - headOffset;
            center[2] = entry.worldZ;

            this.writeQuad(x, y, spriteW, spriteH);

            this.tint[0] = 1.0;
            this.tint[1] = 1.0;
            this.tint[2] = 1.0;
            this.tint[3] = 1.0;

            this.positions.data(this.quadVerts);
            this.uvs.data(this.quadUvs);
            this.drawCall
                .uniform("u_screenSize", this.screenSize)
                .uniform("u_centerWorld", center)
                .uniform("u_tint", this.tint)
                .texture("u_sprite", sprite.tex)
                .draw();
        }
    }

    private writeQuad(x: number, y: number, w: number, h: number): void {
        const verts = this.quadVerts;
        verts[0] = x;
        verts[1] = y;
        verts[2] = x;
        verts[3] = y + h;
        verts[4] = x + w;
        verts[5] = y + h;
        verts[6] = x;
        verts[7] = y;
        verts[8] = x + w;
        verts[9] = y + h;
        verts[10] = x + w;
        verts[11] = y;
    }
}
