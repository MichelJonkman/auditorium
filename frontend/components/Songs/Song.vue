<template>
    <div>
        <div class="card bg-dark mb-3"
             :class="($music.currentSong && $music.currentSong.id === song.id ? 'selected' : '') + ' ' + song.player.state">
            <div class="card-body">
                <div class="play me-1" @click="toggle()"
                     :class="$music.currentSong && ['stopping', 'pausing', 'starting', 'unpausing'].includes($music.currentSong.player.state) ? 'button-disabled' : ''">
                    <div
                        v-if="$music.currentSong && !['paused', 'pausing', 'stopping', 'stopped'].includes(song.player.state)"
                        class="bi bi-pause"></div>
                    <div v-else class="bi bi-play"></div>
                </div>
                <div class="info">
                    {{ song.manifest.name }}
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import {Song} from "~~/lib/Songs/Song";
import {PropType} from "vue";

export default {
    name: "Song",
    props: {
        song: {
            type: Object as PropType<Song>,
            required: true
        },
    },
    data() {
        return {};
    },
    methods: {
        toggle() {
            if (!this.song.player) {
                return;
            }

            if (!this.$music.currentSong || this.$music.currentSong.id !== this.song.id) {
                this.song.player.play();
                return;
            }

            if (this.song.player.state === "paused") {
                this.song.player.unPause();
            } else if (this.song.player.state === "playing") {
                this.song.player.pause();
            }
        }
    }
};
</script>

<style lang="scss" scoped>
.card {
    transition: border ease-in-out .1s;
    user-select: none;

    &:hover {
        border-color: #FFB400;
    }

    &.selected {
        border-color: deepskyblue;
    }

    &.starting {
        border-color: white;
    }

    &.stopping {
        border-color: #8b2e24;
    }
}

.card-body {
    display: flex;
    align-items: center;
}

.play {
    cursor: pointer;
    font-size: 2rem;
    line-height: 2rem;
    height: 2rem;
    flex-basis: 2rem;
    display: block;
}

.info {
    display: block;
}
</style>
