/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CommandContext, sendBotMessage } from "@api/Commands";
import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { getCurrentChannel } from "@utils/discord";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Menu, MessageStore } from "@webpack/common";
import type { Embed, Message } from "discord-types/general";

const description = "Create a Youtube playlist from the 50 most recently posted Youtube links in a channel";
const youtubeRegex = /youtube.com\/watch\?v=([^&]+)/;
const logger = new Logger("Playlistify");

function getPlaylistUrl(channelId?: string): string | void {
    const resolvedChannelId = channelId || getCurrentChannel()?.id;
    if (!resolvedChannelId) {
        logger.error('No channel id!');
        return;
    }

    // Discord normalizes Youtube urls in embeds for us from the shortened youtu.be format, which doesn't work for playlist creation
    const messages: Message[] = MessageStore.getMessages(resolvedChannelId)._array;
    const ids: (string | undefined)[] = messages
        .flatMap((m: Message): Embed[] => m.embeds)
        .map((e: Embed) => e.url?.match(youtubeRegex)?.[1]);

    const uniqueIds = ids.filter((v, i, s) => v && s.indexOf(v) === i);
    if (uniqueIds.length === 0) {
        logger.debug('No YouTube IDs found in channel ', channelId);
        return;
    }

    // Youtube only supports creating playlists with a length of up to 50 in this way, so we need to take just the 50 most recent
    const last50 = uniqueIds.length > 50 ? uniqueIds.slice(uniqueIds.length - 51) : uniqueIds;
    // Concatenate ids onto this magic url to create an ad-hoc temporary playlist
    const url = 'http://www.youtube.com/watch_videos?video_ids=' + last50.join(',');
    return url;
}

const contextCommand: NavContextMenuPatchCallback = (children, { channel }) => {
    const channelId = channel?.id;
    if (!channelId) {
        logger.warn('Unable to add playlistify command to channel context menu; no channelId found');
        return;
    }

    const url = getPlaylistUrl(channelId);
    if (url) {
        const openPlaylist = () => VencordNative.native.openExternal(url);
        children.push(<Menu.MenuGroup>
            <Menu.MenuItem
                id="youtube-playlistify"
                label="Playlistify"
                action={openPlaylist}
            />
        </Menu.MenuGroup>);
    }
};

export default definePlugin({
    name: "YoutubePlaylistify",
    description,
    authors: [Devs.twoTspSalt],
    contextMenus: { "channel-context": contextCommand }
});
