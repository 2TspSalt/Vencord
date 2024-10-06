/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors*
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addToolbarButton, removeToolbarButton } from "@api/ToolbarButtons";
import { Devs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { findExportedComponentLazy } from "@webpack";
import { Menu, MessageStore, SelectedChannelStore, useCallback, useEffect, useState, useStateFromStores } from "@webpack/common";
import type { Embed, Message } from "discord-types/general";

import "./index.css";

const name = "YoutubePlaylistify";
const description = "Create a Youtube playlist from the 50 most recently posted Youtube links in a channel";
const youtubeRegex = /youtube.com\/watch\?v=([^&]+)/;
const logger = new Logger("Playlistify");

const HeaderBarIcon = findExportedComponentLazy("Icon", "Divider");

function ToolbarIcon() {
    return (
        <svg role="img" height={24} width={24} viewBox="0 0 100 100">
            <path fill="currentColor" d="M85.2,47.7L20.6,6.5c-5.3-3.3-9.5-1-9.5,5.2V88c0,6.2,4.4,8.8,9.8,5.8l63.9-34.7C90.1,56,90.3,50.9,85.2,47.7z" />
        </svg>
    );
}

function getPlaylistUrl(channelId?: string): string | undefined {
    const resolvedChannelId = channelId || SelectedChannelStore.getChannelId();
    if (!resolvedChannelId) {
        logger.error('No channel id!');
        return;
    }

    // Discord normalizes Youtube urls in embeds for us from the shortened youtu.be format, which doesn't work for playlist creation
    const messages: Message[] = MessageStore.getMessages(resolvedChannelId)._array;
    if (messages.length === 0) {
        logger.debug("No messages found for channel", resolvedChannelId);
        return;
    }
    // TODO: MessageStore.getMessages only returns the last 50 messages; figure out how to get more
    const ids: (string | undefined)[] = messages
        .flatMap((m: Message): Embed[] => m.embeds)
        .map((e: Embed) => e.url?.match(youtubeRegex)?.[1]);

    const uniqueIds = ids.filter((value, index, array) => value && array.indexOf(value) === index);
    if (uniqueIds.length === 0) {
        logger.debug('No YouTube IDs found for channel', resolvedChannelId);
        return;
    }

    // Youtube only supports creating playlists with a length of up to 50 in this way, so we need to take just the 50 most recent
    const last50 = uniqueIds.length > 50 ? uniqueIds.slice(uniqueIds.length - 51) : uniqueIds;
    // Concatenate ids onto this magic url to create an ad-hoc temporary playlist
    const url = 'http://www.youtube.com/watch_videos?video_ids=' + last50.join(',');
    return url;
}

function ToolbarButton() {
    const channelId = useStateFromStores([SelectedChannelStore], () => SelectedChannelStore.getChannelId());
    const [url, setUrl] = useState<string | undefined>();
    useEffect(() => { setUrl(getPlaylistUrl(channelId)); }, [channelId, setUrl]);
    useEffect(() => {
        function listener() {
            const newUrl = getPlaylistUrl(channelId);
            setUrl(newUrl);
        }
        // @ts-ignore
        MessageStore.addChangeListener(listener);
        // @ts-ignore
        return () => MessageStore.removeChangeListener(listener);
    }, [setUrl, channelId]);

    // TODO: update url on new message with youtube embed in current channel

    const onClick = useCallback(() => {
        logger.debug('onClick', url);
        if (url) {
            VencordNative.native.openExternal(url);
        }
    }, [url]);

    if (!url) {
        return null;
    }
    return <HeaderBarIcon className="ytpl-btn" icon={ToolbarIcon} onClick={onClick} tooltip="Playlistify" />;
}

const contextCommand: NavContextMenuPatchCallback = (children, { channel }) => {
    const channelId = channel?.id;
    if (!channelId) {
        logger.warn('Unable to add playlistify command to channel context menu; no channelId found');
        return;
    }
    const url = getPlaylistUrl(channelId);
    const openPlaylist = url
        ? () => { VencordNative.native.openExternal(url); }
        : () => { logger.debug('context - noop'); };
    children.push(<Menu.MenuGroup>
        <Menu.MenuItem
            id="youtube-playlistify"
            label="Playlistify"
            action={openPlaylist}
            disabled={!url}
        />
    </Menu.MenuGroup>);
};

export default definePlugin({
    name,
    description,
    dependencies: ["ToolbarButtonsAPI"],
    authors: [Devs.twoTspSalt],
    contextMenus: { "channel-context": contextCommand },
    start: () => {
        addToolbarButton(name, { Component: ToolbarButton, position: 0 });
    },
    end: () => {
        removeToolbarButton(name);
    }
});
