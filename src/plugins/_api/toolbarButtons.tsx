/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "ToolbarButtonsAPI",
    description: "API to add buttons to upper right toolbar.",
    authors: [Devs.Ven, Devs.twoTspSalt],
    patches: [
        {
            find: "toolbar:function",
            replacement: {
                match: /(?<=toolbar:function.{0,100}\()\i.Fragment,/,
                replace: "Vencord.Api.ToolbarButtons.ToolbarWrapper,"
            }
        }
    ],
});
