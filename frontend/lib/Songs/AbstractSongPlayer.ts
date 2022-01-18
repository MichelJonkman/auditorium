import {Config} from "~/lib/Config";
import {easeInOutQuad, timeout} from "@/shared/helpers";
import {Song} from "~/lib/Songs/Song";
import {Main} from "~/lib/Main";

/**
 * The default song player
 */
export abstract class AbstractSongPlayer {
    public state: SongPlayerStatus = 'stopped';

    public song: Song;

    protected tracks: TracksObjectInterface = {};

    protected progressTimer: NodeJS.Timer | null = null;

    protected constructor(song: Song) {
        this.song = song;
    }

    protected initTrack(track: TrackInterface, file: Uint8Array | null) {
        return new Promise<void>((resolve) => {
            if (!(file instanceof Uint8Array)) {
                throw new Error('Given file is not of type Uint8Array');
            }

            track.audio.src = URL.createObjectURL(new Blob([file]));

            track.context = new AudioContext();
            let source = track.context.createMediaElementSource(track.audio);

            source.mediaElement.addEventListener('canplaythrough', () => {
                track.gain = track.context.createGain();
                source.connect(track.gain);
                track.gain.connect(track.context.destination);
                resolve();
            }, {
                once: true
            });
        });
    }

    protected purgeTrack(track: TrackInterface) {
        track.audio = document.createElement('audio');
    }

    protected createTrack(name: string) {
        this.tracks[name] = {
            audio: document.createElement('audio'),
            context: new AudioContext(),
            gain: {} as GainNode
        };
    }

    public getVolume(mod: number) {
        return Config.data.volume * mod * (this.song.manifest.gainMod ?? 1);
    }

    updateVolume(mod: number) {
        for (let track of Object.values<TrackInterface>(this.tracks)) {
            track.gain.gain.value = this.getVolume(mod);
        }
    }

    /**
     * @param time Time to fade in seconds
     * @param updateFunc The function to call when updating volume, by default this.updateVolume
     */
    async fadeOut(time: number = 1.5, updateFunc = this.updateVolume) {
        let delay = time * 10;

        for (let i = 100; i > 0; i--) {
            await timeout(delay);
            let mod = easeInOutQuad(i / 100);
            updateFunc.apply(this, [mod]);
        }
    }

    /**
     * @param time Time to fade in seconds
     * @param updateFunc The function to call when updating volume, by default this.updateVolume
     */
    async fadeIn(time: number = 1, updateFunc = this.updateVolume) {
        let delay = time * 10;
        for (let i = 0; i < 100; i++) {
            await timeout(delay);
            let mod = easeInOutQuad(i / 100);
            updateFunc.apply(this, [mod]);
        }
    }

    async init() {
        await this.initTracks();

        this.updateVolume(0);
    }

    public async play() {
        if (Main.$root.$music.songChanging) {
            return;
        }

        if (Main.$root.$music.currentSong?.id === this.song.id) {
            return;
        }

        this.state = 'starting';
        Main.$root.$music.songChanging = true;

        try {
            if (Main.$root.$music.currentSong) {
                let result = await Promise.allSettled([
                    Main.$root.$music.currentSong.player?.stop(),
                    this.init()
                ]);

                if (result[1].status === 'rejected') {
                    throw result[1].reason;
                }
            } else {
                await this.init();
            }

            await this.startTracks();
        } catch (e) {
            this.state = 'stopped';
            Main.$root.$music.currentSong = null;
            Main.$root.$music.songChanging = false;

            throw e;
        }

        Main.$root.$emit('play', {
            duration: this.getDuration()
        });

        Main.$root.$music.currentSong = this.song;
        Main.$root.$music.songChanging = false;
        this.startProgressTimer();

        await this.fadeIn();
        this.state = 'playing';
    }

    public async stop() {
        this.state = 'stopping';

        await this.fadeOut();
        await this.stopTracks();

        this.state = 'stopped';
        Main.$root.$emit('stop');

        this.purgeTracks();
    }

    public async pause() {
        this.state = 'pausing';
        await this.fadeOut(1);

        await this.pauseTracks();
        this.state = 'paused';
    }

    public async unPause() {
        this.state = 'unpausing';
        this.startProgressTimer();
        await this.unPauseTracks();
        await this.fadeIn(1);
        this.state = 'playing';
    }

    protected startProgressTimer() {
        if (this.progressTimer) {
            clearInterval(this.progressTimer);
        }
        this.progressTimer = setInterval(() => {
            this.checkProgressTimer();

            Main.$root.$music.currentSongProgress = this.getCurrentTime();
        }, 100);
    }

    protected checkProgressTimer() {
        if (this.progressTimer && ['stopped', 'paused'].includes(this.state)) {
            clearInterval(this.progressTimer);
        }
    }

    public setProgress(progress: number) {
        Main.$root.$music.currentSongProgress = progress;
        return this.setCurrentTime(progress);
    }

    protected abstract initTracks(): Promise<void>;

    protected abstract startTracks(): Promise<void>;

    protected abstract stopTracks(): void;

    public abstract pauseTracks(): void;

    public abstract unPauseTracks(): Promise<void>;

    protected abstract purgeTracks(): void;

    public abstract getDuration(): number;

    protected abstract getCurrentTime(): number;

    protected abstract setCurrentTime(progress: number): void;
}

export interface TracksObjectInterface {
    [track: string]: TrackInterface;
}

export interface TrackInterface {
    audio: HTMLAudioElement;
    context: AudioContext;
    gain: GainNode;

}

export type SongPlayerStatus = 'starting' | 'playing' | 'pausing' | 'paused' | 'unpausing' | 'stopping' | 'stopped';